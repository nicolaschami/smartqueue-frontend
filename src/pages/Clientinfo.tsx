import { useRef, type FC } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/theme.css';

const TicketMark = () => (
  <svg className="sq-mark-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3.5a2 2 0 0 0 0 4V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a2 2 0 0 0 0-4V8Z"
      fill="currentColor"
    />
    <rect x="12" y="12" width="8" height="1.6" rx="0.8" fill="#e8a33d" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 18s6-5.1 6-9.6A6 6 0 0 0 4 8.4C4 12.9 10 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="10" cy="8.3" r="2.1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6.1 3.5h2l1.1 3.2-1.6 1.4a9 9 0 0 0 4.3 4.3l1.4-1.6 3.2 1.1v2a1.3 1.3 0 0 1-1.4 1.3A13.4 13.4 0 0 1 4.8 4.9a1.3 1.3 0 0 1 1.3-1.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.25" y="4" width="15.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m3.25 5.25 6.04 4.62a1.15 1.15 0 0 0 1.42 0l6.04-4.62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2.75 10h14.5M10 2.75c2.1 2 3.2 4.6 3.2 7.25s-1.1 5.25-3.2 7.25c-2.1-2-3.2-4.6-3.2-7.25S7.9 4.75 10 2.75Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 5.75V10l3 1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 3v9.5M6.25 9.25 10 13l3.75-3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.75 14.5v1.25a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DashboardIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.75" y="3.25" width="6.2" height="6.2" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11.05" y="3.25" width="6.2" height="9.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2.75" y="11.55" width="6.2" height="5.2" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export interface Business {
  id: string;
  name: string;
  address: string;
  Slug: string;
  phone: string;
  country: string;
  timezone: string;
  email: string;
}

export interface Queue {
  id: string;
  name: string;
  status: string;
  nextNumber: number;
  averageservicem: number;
}

interface ClientInfoProps {
  business: Business;
  queues: Queue[];
  onOpenDashboard?: (queueId: string) => void;
  /** Path (relative to window.location.origin) of your JoinQueue route. */
  joinPath?: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'sq-queue-badge--open' },
  closed: { label: 'Closed', className: 'sq-queue-badge--closed' },
  paused: { label: 'Paused', className: 'sq-queue-badge--paused' },
};

const getStatusMeta = (status: string) =>
  STATUS_STYLES[status.toLowerCase()] ?? { label: status, className: 'sq-queue-badge--paused' };

const ClientInfo: FC<ClientInfoProps> = ({
  business,
  queues,
  onOpenDashboard,
  joinPath = '/DisplayQueue',
}) => {
  // One canvas per open queue, kept around so the download button can read
  // pixels straight out of it — no network round-trip needed to save a PNG.
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const openCount = queues.filter((q) => q.status.toLowerCase() === 'open').length;

  // The QR encodes a link to your actual JoinQueue page for THIS queue —
  // JoinQueue reads `queueId` back out of this query string (see JoinQueue.tsx).
  const getJoinUrl = (queue: Queue) =>
    `${window.location.origin}${joinPath}?queueId=${queue.id}`;

  // Composites the raw QR onto a small branded card — business name up top,
  // "Scan to join the line" + a SmartQueue footer underneath — then hands
  // back a PNG blob ready to save.
  const buildQrImage = async (queue: Queue): Promise<Blob | null> => {
    const sourceCanvas = canvasRefs.current[queue.id];
    if (!sourceCanvas) return null;

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const qrSize = 380;
    const padding = 40;
    const headerH = 96;
    const footerH = 84;
    const width = qrSize + padding * 2;
    const height = headerH + qrSize + footerH;

    const composite = document.createElement('canvas');
    composite.width = width;
    composite.height = height;
    const ctx = composite.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#dbe2dd';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(0, 0, width, 6);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#16201d';
    ctx.font = '700 23px "Public Sans", sans-serif';
    ctx.fillText(business.name, width / 2, 46, width - padding);

    ctx.fillStyle = '#5b6b64';
    ctx.font = '600 14px "Public Sans", sans-serif';
    ctx.fillText(queue.name, width / 2, 72, width - padding);

    ctx.drawImage(sourceCanvas, padding, headerH, qrSize, qrSize);

    ctx.fillStyle = '#16201d';
    ctx.font = '700 15px "Public Sans", sans-serif';
    ctx.fillText('Scan to join the line', width / 2, headerH + qrSize + 32);

    ctx.fillStyle = '#9aa7a1';
    ctx.font = '500 11.5px "Public Sans", sans-serif';
    ctx.fillText('Powered by SmartQueue', width / 2, headerH + qrSize + 56);

    return new Promise((resolve) => composite.toBlob((blob) => resolve(blob), 'image/png'));
  };

  const handleDownloadQr = async (queue: Queue) => {
    const blob = await buildQrImage(queue);
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    const fileName = `${business.name}-${queue.name}-qr.png`.replace(/\s+/g, '-').toLowerCase();

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <main className="sq-page sq-info-shell">
      <header className="sq-info-header">
        <div className="sq-info-header-inner">
          <div>
            <div className="sq-info-brand">
              <TicketMark />
              <span>SmartQueue</span>
            </div>

            <h1 className="sq-info-name">{business.name}</h1>
            <p className="sq-info-slug">{business.Slug}</p>

            <div className="sq-info-meta">
              {business.address && (
                <span className="sq-info-meta-item"><PinIcon />{business.address}</span>
              )}
              {business.phone && (
                <span className="sq-info-meta-item"><PhoneIcon />{business.phone}</span>
              )}
              {business.email && (
                <span className="sq-info-meta-item"><MailIcon />{business.email}</span>
              )}
              {business.timezone && (
                <span className="sq-info-meta-item"><GlobeIcon />{business.timezone}</span>
              )}
            </div>
          </div>

          <div className="sq-info-stats">
            <div className="sq-info-stat">
              <p className="sq-info-stat-num">{queues.length}</p>
              <p className="sq-info-stat-label">Queues</p>
            </div>
            <div className="sq-info-stat">
              <p className="sq-info-stat-num">{openCount}</p>
              <p className="sq-info-stat-label">Open now</p>
            </div>
          </div>
        </div>
      </header>

      <div className="sq-info-content">
        <p className="sq-info-section-title">Your queues</p>

        {queues.length === 0 ? (
          <div className="sq-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            No queues yet. Create one to start giving out tickets.
          </div>
        ) : (
          <div className="sq-queue-grid">
            {queues.map((queue) => {
              const status = getStatusMeta(queue.status);
              const isOpen = queue.status.toLowerCase() === 'open';
              const joinUrl = getJoinUrl(queue);

              return (
                <article className="sq-queue-card" key={queue.id}>
                  <div className="sq-queue-card-top">
                    <h2 className="sq-queue-name">{queue.name}</h2>
                    <span className={`sq-queue-badge ${status.className}`}>{status.label}</span>
                  </div>

                  <div className="sq-queue-ticket">
                    <p className="sq-queue-ticket-label">Next number</p>
                    <span className="sq-queue-ticket-number">{String(queue.nextNumber).padStart(3, '0')}</span>
                  </div>

                  <div className="sq-queue-service">
                    <ClockIcon />
                    ~{queue.averageservicem} min per visit
                  </div>

                  {isOpen ? (
                    <>
                      <div className="sq-queue-qr-row">
                        {/* Rendered at 480px internally for a crisp download, shown small on the card. */}
                        <QRCodeCanvas
                          ref={(el) => { canvasRefs.current[queue.id] = el; }}
                          value={joinUrl}
                          size={480}
                          level="M"
                          includeMargin
                          style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid var(--line)' }}
                        />
                        <span className="sq-queue-qr-hint">Scan to join this queue</span>
                      </div>

                      <div className="sq-queue-actions">
                        <button
                          type="button"
                          className="sq-btn sq-btn-quiet"
                          onClick={() => handleDownloadQr(queue)}
                        >
                          <DownloadIcon />
                          Download QR
                        </button>
                        <button
                          type="button"
                          className="sq-btn sq-btn-primary"
                          onClick={() => onOpenDashboard?.(queue.id)}
                        >
                          <DashboardIcon />
                          Open dashboard
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="sq-queue-closed-note">
                      This queue is closed — reopen it to share a QR code or open its dashboard.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default ClientInfo;
