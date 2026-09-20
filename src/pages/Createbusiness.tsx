import { useMemo, useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import QRCode from 'qrcode';
import '../styles/theme.css';
import { API_BASE_URL } from '../api';

export interface Business {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  queueCount?: number;
}

export interface Queue {
  id: string;
  businessId: string;
  queuename: string;
  status: 'open' | 'closed';
  avgServiceMinutes?: number;
  openedAt: string;
  closedAt: string | null;
}

const COUNTRIES: { code: string; name: string; timezone: string }[] = [
  { code: 'MA', name: 'Morocco', timezone: 'Africa/Casablanca' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris' },
  { code: 'ES', name: 'Spain', timezone: 'Europe/Madrid' },
  { code: 'US', name: 'United States', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'AE', name: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  { code: 'DE', name: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'IT', name: 'Italy', timezone: 'Europe/Rome' },
  { code: 'CA', name: 'Canada', timezone: 'America/Toronto' },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const TicketMark = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: 28, height: 28 }}>
    <path
      d="M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3.5a2 2 0 0 0 0 4V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a2 2 0 0 0 0-4V8Z"
      fill="currentColor"
    />
    <rect x="12" y="12" width="8" height="1.6" rx=".8" fill="#e8a33d" />
  </svg>
);

const QueueAddIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M3 6h13" />
    <path d="M3 12h9" />
    <path d="M3 18h5" />
    <circle cx="19" cy="16" r="3" />
    <path d="M19 15v2" />
    <path d="M18 16h2" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const QrDownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z" />
    <path d="M20 14v3" />
    <path d="M14 20h6" />
  </svg>
);

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawWrappedCenteredText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
) => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
  return lines.length;
};

const sanitizeFileNamePart = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'queue';

interface CreateBusinessProps {
  apiBaseUrl?: string;
  onSubmit?: (payload: Partial<Business>) => Promise<void> | void;
  onSelectBusiness?: (business: Business) => void;
  onQueueCreated?: (business: Business, queue: { name: string; avgServiceMinutes: number }) => void;
  onCancel?: () => void;
}

const CreateBusiness: FC<CreateBusinessProps> = ({
  //apiBaseUrl = 'http://localhost:3000/api',
  apiBaseUrl = `${API_BASE_URL}/api`, // Uses your dynamic base URL
  onSubmit,
  onSelectBusiness,
  onQueueCreated,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [queueModalBusiness, setQueueModalBusiness] = useState<Business | null>(null);
  const [queueName, setQueueName] = useState('');
  const [queueAvgServiceMinutes, setQueueAvgServiceMinutes] = useState('');
  const [isCreatingQueue, setIsCreatingQueue] = useState(false);
  const [queueFormError, setQueueFormError] = useState('');

  const [viewQueuesBusiness, setViewQueuesBusiness] = useState<Business | null>(null);
  const [businessQueues, setBusinessQueues] = useState<Queue[]>([]);
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);
  const [queuesListError, setQueuesListError] = useState('');
  const [downloadingQueueId, setDownloadingQueueId] = useState<string | null>(null);
  const [qrDownloadError, setQrDownloadError] = useState('');
  const [closingQueueId, setClosingQueueId] = useState<string | null>(null);
  const [closeQueueError, setCloseQueueError] = useState('');

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode),
    [countryCode]
  );

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countrySearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryOpen(false);
        const current = COUNTRIES.find((c) => c.code === countryCode);
        setCountrySearch(current ? current.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryCode]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchBusinesses();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!queueModalBusiness) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreatingQueue) {
        setQueueModalBusiness(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [queueModalBusiness, isCreatingQueue]);

  useEffect(() => {
    if (!viewQueuesBusiness) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewQueuesBusiness(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewQueuesBusiness]);

  const fetchBusinesses = async () => {
    setIsLoadingList(true);
    setListError('');
    try {
      const response = await fetch(`${apiBaseUrl}/businesses`);
      if (!response.ok) throw new Error('Failed to fetch businesses');
      const data: Business[] = await response.json();
      setBusinesses(data);
    } catch (err: any) {
      setListError(err.message || 'Could not load businesses.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      const matchesSearch =
        biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        biz.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (biz.phone && biz.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (biz.address && biz.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCountry = countryFilter === 'ALL' || biz.country === countryFilter;

      return matchesSearch && matchesCountry;
    });
  }, [businesses, searchQuery, countryFilter]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Give your business a name.');
      return;
    }
    if (!slug.trim()) {
      setFormError('Choose a link for customers to join your queue.');
      return;
    }
    if (!country) {
      setFormError('Please select a country.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        phone: phone.trim(),
        address: address.trim(),
        country: country.code,
        timezone: country.timezone,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const res = await fetch(`${apiBaseUrl}/businesses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || errData.error || 'Failed to create business.');
        }
      }

      setName('');
      setSlug('');
      setPhone('');
      setAddress('');
      setCountryCode('');
      setCountrySearch('');
      setSlugEdited(false);
      setActiveTab('list');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create your business. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQueueModal = (biz: Business) => {
    setQueueModalBusiness(biz);
    setQueueName('');
    setQueueAvgServiceMinutes('');
    setQueueFormError('');
  };

  const closeQueueModal = () => {
    if (isCreatingQueue) return;
    setQueueModalBusiness(null);
  };

  const openQueuesListModal = async (biz: Business) => {
    setViewQueuesBusiness(biz);
    setBusinessQueues([]);
    setQueuesListError('');
    setQrDownloadError('');
    setCloseQueueError('');
    setIsLoadingQueues(true);
    try {
      const res = await fetch(`${apiBaseUrl}/businesses/${biz.id}/queues`);
      if (!res.ok) throw new Error('Failed to fetch queues.');
      const data: Queue[] = await res.json();
      setBusinessQueues(data);
    } catch (err) {
      setQueuesListError(err instanceof Error ? err.message : 'Could not load queues.');
    } finally {
      setIsLoadingQueues(false);
    }
  };

  const closeQueuesListModal = () => setViewQueuesBusiness(null);

  const handleToggleQueueStatus = async (queue: Queue) => {
    setCloseQueueError('');
    setClosingQueueId(queue.id);

    const newStatus = queue.status === 'open' ? 'closed' : 'open';

    try {
      const res = await fetch(`${apiBaseUrl}/queues/${queue.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.message || errData.error || `Failed to ${newStatus === 'open' ? 'open' : 'close'} queue.`
        );
      }

      const updated = await res.json();

      setBusinessQueues((prev) =>
        prev.map((q) =>
          q.id === updated.id
            ? {
                ...q,
                status: updated.status || newStatus,
                closedAt: updated.closedAt !== undefined ? updated.closedAt : (newStatus === 'closed' ? new Date().toISOString() : null),
              }
            : q
        )
      );
    } catch (err) {
      setCloseQueueError(
        err instanceof Error
          ? err.message
          : `Could not ${newStatus === 'open' ? 'open' : 'close'} the queue. Try again.`
      );
    } finally {
      setClosingQueueId(null);
    }
  };

  const handleDownloadQueueQr = async (business: Business, queue: Queue) => {
    setQrDownloadError('');
    setDownloadingQueueId(queue.id);
    try {
      const qrDataUrl = await QRCode.toDataURL('http://localhost:3000/api/businesses/'+ queue.id+'/queues', {
        width: 320,
        margin: 1,
        color: { dark: '#16201d', light: '#ffffff' },
      });

      const qrImage = new Image();
      qrImage.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error('Could not render QR image.'));
      });

      const width = 480;
      const height = 660;
      const qrSize = 320;
      const qrTop = 132;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e5e1d8';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      ctx.textAlign = 'center';

      ctx.fillStyle = '#16201d';
      ctx.font = '700 26px sans-serif';
      const nameLines = drawWrappedCenteredText(ctx, business.name, width / 2, 66, width - 80, 32);

      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = '#c98a2b';
      ctx.fillText('SCAN TO JOIN THE QUEUE', width / 2, 66 + nameLines * 32 + (nameLines > 1 ? 6 : 20));

      ctx.drawImage(qrImage, (width - qrSize) / 2, qrTop, qrSize, qrSize);

      ctx.font = '700 20px sans-serif';
      ctx.fillStyle = '#16201d';
      ctx.fillText(queue.queuename || 'Queue', width / 2, qrTop + qrSize + 42);

      ctx.font = '400 13px sans-serif';
      ctx.fillStyle = '#8a8578';
      const avgText = queue.avgServiceMinutes ? `~${queue.avgServiceMinutes} min per person` : 'Time N/A';
      ctx.fillText(avgText, width / 2, qrTop + qrSize + 66);

      const pillLabel = 'SCAN HERE TO GET A NUMBER';
      ctx.font = '800 14px sans-serif';
      const pillTextWidth = ctx.measureText(pillLabel).width;
      const pillWidth = pillTextWidth + 48;
      const pillHeight = 40;
      const pillX = (width - pillWidth) / 2;
      const pillY = height - 76;

      drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
      ctx.fillStyle = '#e8a33d';
      ctx.fill();

      ctx.fillStyle = '#16201d';
      ctx.fillText(pillLabel, width / 2, pillY + pillHeight / 2 + 5);

      const link = document.createElement('a');
      link.download = `${sanitizeFileNamePart(business.name)}-${sanitizeFileNamePart(queue.queuename || 'queue')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      setQrDownloadError(err instanceof Error ? err.message : 'Could not generate the QR code.');
    } finally {
      setDownloadingQueueId(null);
    }
  };

  const handleCreateQueue = async (event: FormEvent) => {
    event.preventDefault();
    if (!queueModalBusiness) return;

    const trimmedName = queueName.trim();
    const minutes = Number(queueAvgServiceMinutes);

    if (!trimmedName) {
      setQueueFormError('Give the queue a name.');
      return;
    }
    if (!queueAvgServiceMinutes.trim() || !Number.isInteger(minutes) || minutes <= 0) {
      setQueueFormError('Average service time must be a whole number of minutes greater than 0.');
      return;
    }

    setQueueFormError('');
    setIsCreatingQueue(true);
    try {
      const res = await fetch(`${apiBaseUrl}/businesses/${queueModalBusiness.id}/queues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, avgServiceMinutes: minutes }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to create queue.');
      }

      onQueueCreated?.(queueModalBusiness, { name: trimmedName, avgServiceMinutes: minutes });

      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === queueModalBusiness.id ? { ...b, queueCount: (b.queueCount ?? 0) + 1 } : b
        )
      );

      if (viewQueuesBusiness?.id === queueModalBusiness.id) {
        openQueuesListModal(queueModalBusiness);
      }

      setQueueModalBusiness(null);
    } catch (err) {
      setQueueFormError(err instanceof Error ? err.message : 'Could not create the queue. Try again.');
    } finally {
      setIsCreatingQueue(false);
    }
  };

  return (
    <main
      className="sq-page"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          .sq-queue-card {
            transition: all 0.2s ease;
          }
          .sq-queue-card:hover {
            border-color: var(--amber) !important;
            box-shadow: 0 4px 16px rgba(232, 163, 61, 0.15) !important;
            transform: translateY(-1px);
          }
          .sq-toggle-btn {
            transition: all 0.2s ease;
          }
          .sq-toggle-btn:hover:not(:disabled) {
            opacity: 0.85;
            transform: scale(1.02);
          }
          .sq-icon-btn {
            transition: all 0.2s ease;
          }
          .sq-icon-btn:hover:not(:disabled) {
            background: #e0e5e2 !important;
            color: var(--ink) !important;
          }
          .sq-scroll-area::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .sq-scroll-area::-webkit-scrollbar-thumb {
            background: #cbd5d1;
            border-radius: 4px;
          }
        `}
      </style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(232,163,61,.10)',
          top: -220,
          right: -100,
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          minHeight: 640,
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          background: 'var(--surface)',
          border: '1px solid rgba(22,32,29,.08)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(22,32,29,.12)',
          position: 'relative',
          zIndex: 1,
          flex: 1,
        }}
      >
        <aside
          style={{
            padding: '36px 28px',
            background: 'var(--panel-dark)',
            color: '#f9f7ef',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 18, fontWeight: 800, letterSpacing: '-.03em' }}>
              <TicketMark /> SmartQueue
            </div>
            <div style={{ marginTop: 60 }}>
              <p style={{ margin: '0 0 12px', color: 'var(--amber)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.15em' }}>
                Business Hub
              </p>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, letterSpacing: '-.04em' }}>
                Make waiting feel simple.
              </h1>
              <p style={{ margin: '16px 0 0', color: 'rgba(249,247,239,.67)', fontSize: 13.5, lineHeight: 1.6 }}>
                Manage existing operational locations or spin up a new line in minutes.
              </p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(249,247,239,.14)', paddingTop: 16, color: 'rgba(249,247,239,.56)', fontSize: 11.5, lineHeight: 1.5 }}>
            You can update these details anytime from your business settings.
          </div>
        </aside>

        <section style={{ padding: '36px clamp(24px, 3vw, 42px)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--paper)',
              padding: 4,
              borderRadius: 12,
              marginBottom: 20,
              border: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                background: activeTab === 'list' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'list' ? 'var(--ink)' : 'var(--ink-soft)',
                boxShadow: activeTab === 'list' ? '0 2px 8px rgba(22,32,29,.08)' : 'none',
                transition: 'all .16s ease',
              }}
            >
              My Businesses ({businesses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                background: activeTab === 'create' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'create' ? 'var(--ink)' : 'var(--ink-soft)',
                boxShadow: activeTab === 'create' ? '0 2px 8px rgba(22,32,29,.08)' : 'none',
                transition: 'all .16s ease',
              }}
            >
              + Create Business
            </button>
          </div>

          {activeTab === 'create' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-.04em' }}>
                  Create a new business
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  A few details are all you need to get your queue ready.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="sq-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 10px 28px rgba(22,32,29,.06)',
                  maxWidth: 600,
                }}
                noValidate
              >
                <label className="sq-field">
                  <span className="sq-label">Business name</span>
                  <input
                    className="sq-input"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Mario's Barbershop"
                    autoFocus
                  />
                </label>

                <label className="sq-field">
                  <span className="sq-label">Your queue link</span>
                  <input
                    className="sq-input"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugEdited(true);
                      setFormError('');
                    }}
                    placeholder="marios-barbershop"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="sq-field">
                    <span className="sq-label">Phone</span>
                    <input className="sq-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 00 00 00 01" />
                  </label>

                  <div className="sq-field" style={{ position: 'relative' }} ref={countryDropdownRef}>
                    <span className="sq-label">Country</span>
                    <input
                      type="text"
                      className="sq-input"
                      value={countrySearch}
                      onChange={(e) => {
                        setCountrySearch(e.target.value);
                        setIsCountryOpen(true);
                        setFormError('');
                      }}
                      onFocus={() => setIsCountryOpen(true)}
                      placeholder="Search country..."
                      style={{ cursor: 'pointer' }}
                    />
                    {isCountryOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: 8,
                          maxHeight: 180,
                          overflowY: 'auto',
                          zIndex: 10,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                        }}
                      >
                        {filteredCountries.length === 0 ? (
                          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ink-soft)' }}>
                            No countries found
                          </div>
                        ) : (
                          filteredCountries.map((c) => (
                            <div
                              key={c.code}
                              onClick={() => {
                                setCountryCode(c.code);
                                setCountrySearch(c.name);
                                setIsCountryOpen(false);
                                setFormError('');
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: 12.5,
                                cursor: 'pointer',
                                background: countryCode === c.code ? 'var(--paper)' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid rgba(22,32,29,.03)',
                              }}
                            >
                              <span>{c.name}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{c.code}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <label className="sq-field">
                  <span className="sq-label">Address</span>
                  <input className="sq-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Rue Hassan II, Casablanca" />
                </label>

                {formError && <p className="sq-error" role="alert" style={{ margin: 0 }}>{formError}</p>}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {onCancel && (
                    <button type="button" className="sq-btn sq-btn-quiet" onClick={onCancel}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="sq-btn sq-btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating…' : 'Create business'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <input
                  type="text"
                  className="sq-input"
                  placeholder="Search by name, slug, phone, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, height: 40, fontSize: 13 }}
                />
                <select
                  className="sq-select"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={{ width: 140, height: 40, fontSize: 13 }}
                >
                  <option value="ALL">All Countries</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', height: 40 }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0 14px',
                      border: 'none',
                      background: viewMode === 'cards' ? 'var(--ink)' : 'transparent',
                      color: viewMode === 'cards' ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0 14px',
                      border: 'none',
                      background: viewMode === 'table' ? 'var(--ink)' : 'transparent',
                      color: viewMode === 'table' ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    Table
                  </button>
                </div>
              </div>

              {isLoadingList ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                  Loading businesses...
                </div>
              ) : listError ? (
                <div className="sq-card" style={{ padding: 16, background: 'var(--red-soft)', borderColor: 'transparent' }}>
                  <p className="sq-error" style={{ margin: 0 }}>{listError}</p>
                  <button type="button" className="sq-btn sq-btn-quiet" style={{ marginTop: 8, height: 32, fontSize: 12 }} onClick={fetchBusinesses}>
                    Try Again
                  </button>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="sq-card" style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                    No businesses match your search.
                  </p>
                </div>
              ) : viewMode === 'cards' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                    overflowY: 'auto',
                    flex: 1,
                  }}
                >
                  {filteredBusinesses.map((biz) => (
                    <div
                      key={biz.id}
                      className="sq-card"
                      style={{
                        padding: '16px',
                        borderRadius: 14,
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
                        cursor: 'pointer',
                        transition: 'all .2s ease',
                      }}
                      onClick={() => onSelectBusiness?.(biz)}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#f0f3f1', color: 'var(--ink)' }}>
                            {biz.country}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: biz.isActive ? '#e8f5e9' : '#ffebee',
                              color: biz.isActive ? '#2e7d32' : '#c62828',
                            }}
                          >
                            {biz.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                          {biz.name}
                        </h3>
                        <p style={{ margin: '4px 0 8px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--amber-dark)', fontWeight: 600 }}>
                          smartqueue.app/j/{biz.slug}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          <div>📍 {biz.address || 'No address'}</div>
                          <div>📞 {biz.phone || 'No phone'}</div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openQueuesListModal(biz);
                          }}
                          title="View queues"
                          style={{
                            marginTop: 10,
                            border: 'none',
                            background: '#f0f3f1',
                            color: 'var(--ink)',
                            fontWeight: 700,
                            fontSize: 11.5,
                            padding: '4px 10px',
                            borderRadius: 999,
                            cursor: 'pointer',
                            display: 'inline-block',
                          }}
                        >
                          {biz.queueCount ?? 0} queue{(biz.queueCount ?? 0) === 1 ? '' : 's'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          type="button"
                          className="sq-btn sq-btn-quiet"
                          title="Add Queue"
                          aria-label="Add Queue"
                          onClick={(e) => {
                            e.stopPropagation();
                            openQueueModal(biz);
                          }}
                          style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <QueueAddIcon />
                        </button>
                        <button
                          type="button"
                          className="sq-btn sq-btn-quiet"
                          title="Select Business"
                          aria-label="Select Business"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBusiness?.(biz);
                          }}
                          style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div className="sq-scroll-area" style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                    {/* MODIFICATION: Removed minWidth: 900 to allow table to fit screen */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 2 }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Business</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Phone</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Address</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Country</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Queues</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBusinesses.map((biz) => (
                          <tr
                            key={biz.id}
                            style={{ borderBottom: '1px solid rgba(22,32,29,.05)', cursor: 'pointer' }}
                            onClick={() => onSelectBusiness?.(biz)}
                          >
                            {/* MODIFICATION: Removed whiteSpace nowrap, added wordBreak */}
                            <td style={{ padding: '10px 14px', wordBreak: 'break-word' }}>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13, lineHeight: 1.2 }}>{biz.name}</div>
                              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', marginTop: 2 }}>{biz.slug}</div>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                              {biz.phone || '—'}
                            </td>
                            {/* MODIFICATION: Removed whiteSpace nowrap, added wordBreak */}
                            <td style={{ padding: '10px 14px', color: 'var(--ink-soft)', wordBreak: 'break-word' }}>
                              {biz.address || '—'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{biz.country}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openQueuesListModal(biz);
                                }}
                                title="View queues"
                                style={{
                                  border: 'none',
                                  background: '#f0f3f1',
                                  color: 'var(--ink)',
                                  fontWeight: 700,
                                  fontSize: 11.5,
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  cursor: 'pointer',
                                }}
                              >
                                {biz.queueCount ?? 0}
                              </button>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: biz.isActive ? '#2e7d32' : '#c62828' }}>
                                {biz.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="sq-btn sq-btn-quiet"
                                  title="Add Queue"
                                  aria-label="Add Queue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openQueueModal(biz);
                                  }}
                                  style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <QueueAddIcon />
                                </button>
                                <button
                                  type="button"
                                  className="sq-btn sq-btn-quiet"
                                  title="Select Business"
                                  aria-label="Select Business"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectBusiness?.(biz);
                                  }}
                                  style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <ArrowRightIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Add Queue Modal */}
      {queueModalBusiness && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-queue-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22,32,29,.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 24,
          }}
          onClick={closeQueueModal}
        >
          <div
            className="sq-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              padding: 28,
              borderRadius: 24,
              background: 'var(--surface)',
              boxShadow: '0 32px 80px rgba(22,32,29,.3)',
              position: 'relative',
            }}
          >
            <h2 id="add-queue-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.03em' }}>
              Add a queue
            </h2>
            <p style={{ margin: '6px 0 24px', fontSize: 13, color: 'var(--ink-soft)' }}>
              For {queueModalBusiness.name}
            </p>

            <form onSubmit={handleCreateQueue} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
              <label className="sq-field">
                <span className="sq-label">Queue name</span>
                <input
                  className="sq-input"
                  value={queueName}
                  onChange={(e) => {
                    setQueueName(e.target.value);
                    setQueueFormError('');
                  }}
                  placeholder="Front desk"
                  autoFocus
                />
              </label>

              <label className="sq-field">
                <span className="sq-label">Avg. service time (minutes)</span>
                <input
                  className="sq-input"
                  type="number"
                  min={1}
                  step={1}
                  value={queueAvgServiceMinutes}
                  onChange={(e) => {
                    setQueueAvgServiceMinutes(e.target.value);
                    setQueueFormError('');
                  }}
                  placeholder="10"
                />
              </label>

              {queueFormError && <p className="sq-error" role="alert" style={{ margin: 0 }}>{queueFormError}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="sq-btn sq-btn-quiet"
                  onClick={closeQueueModal}
                  disabled={isCreatingQueue}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="sq-btn sq-btn-primary" style={{ flex: 2 }} disabled={isCreatingQueue}>
                  {isCreatingQueue ? 'Saving…' : 'Save queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Queues Modal */}
      {viewQueuesBusiness && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-queues-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22,32,29,.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 24,
          }}
          onClick={closeQueuesListModal}
        >
          <div
            className="sq-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
              background: 'var(--surface)',
              boxShadow: '0 32px 80px rgba(22,32,29,.3)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <h2 id="view-queues-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.03em' }}>
                  Queues
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {viewQueuesBusiness.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openQueueModal(viewQueuesBusiness)}
                style={{
                  height: 36,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--ink)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                + Add
              </button>
            </div>

            <div className="sq-scroll-area" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isLoadingQueues ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                  Loading queues…
                </div>
              ) : queuesListError ? (
                <div style={{ padding: 16, background: 'var(--red-soft)', borderRadius: 12 }}>
                  <p className="sq-error" style={{ margin: 0 }}>{queuesListError}</p>
                </div>
              ) : businessQueues.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                  No queues yet. Click "+ Add" to create one.
                </div>
              ) : (
                businessQueues.map((q) => (
                  <div
                    key={q.id}
                    className="sq-queue-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      border: '1px solid var(--line)',
                      borderRadius: 16,
                      background: 'var(--surface)',
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
                        {q.queuename || 'Unnamed Queue'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
                        {q.avgServiceMinutes ? `${q.avgServiceMinutes} min avg` : 'Time N/A'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: q.status === 'open' ? '#e8f5e9' : '#ffebee',
                          color: q.status === 'open' ? '#2e7d32' : '#c62828',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                        {q.status.toUpperCase()}
                      </span>

                      <button
                        type="button"
                        className="sq-toggle-btn"
                        onClick={() => handleToggleQueueStatus(q)}
                        disabled={closingQueueId === q.id}
                        style={{
                          height: 34,
                          padding: '0 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 999,
                          border: 'none',
                          cursor: closingQueueId === q.id ? 'wait' : 'pointer',
                          background: q.status === 'open' ? 'rgba(198, 40, 40, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                          color: q.status === 'open' ? '#c62828' : '#2e7d32',
                        }}
                      >
                        {closingQueueId === q.id
                          ? (q.status === 'open' ? 'Closing…' : 'Opening…')
                          : (q.status === 'open' ? 'Close' : 'Open')}
                      </button>

                      <button
                        type="button"
                        className="sq-icon-btn"
                        title="Download QR code"
                        aria-label="Download QR code"
                        onClick={() => handleDownloadQueueQr(viewQueuesBusiness, q)}
                        disabled={downloadingQueueId === q.id}
                        style={{
                          height: 34,
                          width: 34,
                          padding: 0,
                          borderRadius: '50%',
                          border: 'none',
                          background: '#f0f3f1',
                          color: 'var(--ink-soft)',
                          cursor: downloadingQueueId === q.id ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {downloadingQueueId === q.id ? '...' : <QrDownloadIcon />}
                      </button>
                    </div>
                  </div>
                ))
              )}

              {closeQueueError && (
                <div style={{ padding: 12, background: 'var(--red-soft)', borderRadius: 8, marginTop: 4 }}>
                  <p className="sq-error" role="alert" style={{ margin: 0, fontSize: 12 }}>{closeQueueError}</p>
                </div>
              )}
              {qrDownloadError && (
                <div style={{ padding: 12, background: 'var(--red-soft)', borderRadius: 8, marginTop: 4 }}>
                  <p className="sq-error" role="alert" style={{ margin: 0, fontSize: 12 }}>{qrDownloadError}</p>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="sq-btn sq-btn-quiet"
                onClick={closeQueuesListModal}
                style={{ minWidth: 100 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CreateBusiness;