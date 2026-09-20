import { useMemo, useState, useEffect, type FC } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/theme.css';
import { API_BASE_URL } from '../api';
// Define the shape of the API response
interface DashboardData {
  queueId: string;
  businessName: string;
  isOpen: boolean;
  stats: {
    waitingCount: number;
    avgWaitMin: number;
    servedToday: number;
  };
  nowServing: {
    id: string;
    number: string;
    customerName: string;
    status: string;
    joinedAt: string;
  } | null;
  waitingList: {
    id: string;
    number: string;
    customerName: string;
    status: string;
    joinedAt: string;
  }[];
}

const CalendarDot = ({ color, pulse }: { color: string; pulse?: boolean }) => (
  <span
    style={{
      width: 10,
      height: 10,
      borderRadius: 999,
      background: color,
      display: 'inline-block',
      boxShadow: pulse ? `0 0 0 4px ${color === 'var(--green)' ? 'rgba(47,158,91,.2)' : 'rgba(183,192,187,.2)'}` : 'none',
      position: 'relative',
    }}
  >
    {pulse && (
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          animation: 'pulse 2s infinite',
        }}
      />
    )}
  </span>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}>
    <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (mins < 1) return 'just now';
  return `${mins} min`;
};

const QueueBoard: FC = () => {
  // Extract queueId from the URL (e.g., /dashboard/edb5b42d-...)
  const { queueId } = useParams<{ queueId: string }>();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);

  const fetchDashboardData = async () => {
    if (!queueId) return;
    setIsLoading(true);
    setError('');
    try {
      console.log("Log data............................");
      //const response = await fetch(`http://localhost:3000/api/queues/${queueId}/dashboard`);
      const response = await fetch(`${API_BASE_URL}/api/queues/${queueId}/dashboard`);
      if (!response.ok) throw new Error('Failed to load queue data.');
      const result: DashboardData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll for updates every 10 seconds to keep the dashboard live
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [queueId]);

  // --- Action Handlers (Connected to API) ---
  const callNext = async () => {
    if (!data || data.waitingList.length === 0) return;
    setIsFlipping(true);
    try {
      //await fetch(`http://localhost:3000/api/queues/${queueId}/call-next`, { method: 'POST', });
       await fetch(`${API_BASE_URL}/api/queues/${queueId}/call-next`);
      await fetchDashboardData(); // Refresh UI
    } catch (err) {
      console.error('Failed to call next:', err);
    } finally {
      setTimeout(() => setIsFlipping(false), 340);
    }
  };

  // No-show: the customer was called (i.e. is/was "Now Serving") but didn't
  // respond. They might still come back later, so this is kept distinct
  // from an explicit cancellation.
  const markNoShow = async (id: string) => {
    try {
     // await fetch(`http://localhost:3000/api/queue-entries/${id}/no-show`, { method: 'PATCH' });
     await fetch(`${API_BASE_URL}/api/queue-entries/${id}/no-show`, {   method: 'PATCH' });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to mark no-show:', err);
    }
  };

  // Served / cancelled share one endpoint on the backend, so we route both
  // through a single generic call and expose thin wrappers for clarity.
  const updateEntryStatus = async (id: string, status: 'served' | 'cancelled') => {
    try {
      console.log(`calling the api with .....${status}`);
      console.log({ id });
      console.log('==========================');
// await fetch(`http://localhost:3000/api/queue-entries/${id}`, {

     await fetch(`${API_BASE_URL}/api/queue-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      await fetchDashboardData();
    } catch (err) {
      console.error(`Failed to mark ${status}:`, err);
    }
  };

  const markServed = (id: string) => updateEntryStatus(id, 'served');

  // Cancelled: the customer told us (or we know) they're not coming at all.
  // This is available from the waiting list, before they're ever called.
  const markCancelled = (id: string) => updateEntryStatus(id, 'cancelled');

  // end of the code ..........
  // --- Loading & Error States ---
  if (isLoading && !data) {
    return (
      <main className="sq-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Loading dashboard...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="sq-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="sq-card" style={{ padding: 32, textAlign: 'center', maxWidth: 400 }}>
          <p className="sq-error" style={{ marginBottom: 16 }}>{error || 'Queue not found.'}</p>
          <button className="sq-btn sq-btn-primary" onClick={fetchDashboardData} style={{ width: '100%' }}>Try Again</button>
        </div>
      </main>
    );
  }

  const isOpen = data.isOpen;

  return (
    <main className="sq-page" style={{ padding: '24px 20px 40px', background: 'linear-gradient(180deg, #faf9f6 0%, #f4f6f3 100%)' }}>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            70% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(0.95); opacity: 0; }
          }
          .sq-queue-item { transition: all 0.2s ease; }
          .sq-queue-item:hover { background: #f8faf8 !important; transform: translateX(4px); }
          .sq-call-btn { transition: all 0.2s ease; }
          .sq-call-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(232, 163, 61, 0.4) !important; }
          .sq-call-btn:active:not(:disabled) { transform: translateY(0); }
        `}
      </style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sq-mark-icon" style={{ width: 24, height: 24, color: 'var(--ink)', background: 'var(--amber)', borderRadius: 6, display: 'grid', placeItems: 'center', padding: 3 }}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
                  <path d="M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3.5a2 2 0 0 0 0 4V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a2 2 0 0 0 0-4V8Z" fill="currentColor" />
                  <rect x="12" y="12" width="8" height="1.6" rx=".8" fill="#fff" />
                </svg>
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>SmartQueue</span>
            </div>
            <div style={{ width: 1, height: 24, background: 'var(--line)', display: 'none' }} className="header-divider" />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)' }}>{data.businessName}</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {/* Optional: Add API call to toggle queue open/close */}}
            style={{
              border: `1px solid ${isOpen ? 'rgba(47, 158, 91, 0.3)' : 'var(--line)'}`,
              background: isOpen ? 'rgba(47, 158, 91, 0.08)' : 'var(--surface)',
              color: isOpen ? '#1c6b3f' : 'var(--ink-soft)',
              height: 36,
              padding: '0 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <CalendarDot color={isOpen ? 'var(--green)' : '#b7c0bb'} pulse={isOpen} />
            {isOpen ? 'Queue is Open' : 'Queue is Closed'}
          </button>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--surface)', padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(232, 163, 61, 0.2)', boxShadow: '0 2px 8px rgba(232, 163, 61, 0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff5e5', color: 'var(--amber-dark)', display: 'grid', placeItems: 'center' }}><UsersIcon /></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--amber-dark)', lineHeight: 1.1 }}>{data.stats.waitingCount}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 }}>Waiting now</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: '14px 16px', borderRadius: 16, border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f3f1', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><ClockIcon /></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)', lineHeight: 1.1 }}>{data.stats.avgWaitMin} <span style={{ fontSize: 14, fontWeight: 600 }}>min</span></div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 }}>Average wait</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(47, 158, 91, 0.2)', boxShadow: '0 2px 8px rgba(47, 158, 91, 0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(47, 158, 91, 0.1)', color: '#1c6b3f', display: 'grid', placeItems: 'center' }}><CheckIcon /></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em', color: '#1c6b3f', lineHeight: 1.1 }}>{data.stats.servedToday}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 }}>Served today</div>
            </div>
          </div>
        </div>

        {/* Main Board Grid */}
        <div className="sq-board-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .9fr) minmax(0, 1.3fr)', gap: 16 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="sq-display" style={{ minHeight: 180, background: 'var(--panel-dark)', borderRadius: 20, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 16px 32px rgba(22,32,29,.15)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(232, 163, 61, 0.05)', top: -40, right: -40 }} />
              <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(232, 163, 61, 0.05)', bottom: -20, left: -20 }} />
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--amber)', marginBottom: 6 }}>Now Serving</p>
              <span className={`${isFlipping ? 'sq-flip' : ''}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 900, color: '#ffffff', lineHeight: 1, textShadow: '0 0 30px rgba(232, 163, 61, 0.4)', marginBottom: 6, transition: 'all 0.3s ease' }}>
                {data.nowServing ? data.nowServing.number : '—'}
              </span>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                {data.nowServing ? data.nowServing.customerName : data.waitingList.length ? 'Ready to call next' : 'No one waiting'}
              </p>
            </div>

            {data.nowServing && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sq-btn sq-btn-quiet"
                  onClick={() => markServed(data.nowServing!.id)}
                  style={{ flex: 1, height: 40, fontSize: 13, fontWeight: 700, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  Mark {data.nowServing.number} as served
                </button>

                <button
                  type="button"
                  className="sq-btn sq-btn-quiet"
                  onClick={() => markNoShow(data.nowServing!.id)}
                  style={{ flex: 1, height: 40, fontSize: 13, fontWeight: 700, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', cursor: 'pointer' }}
                >
                  No-show
                </button>
              </div>
            )}

            <button type="button" className="sq-btn sq-call-btn" onClick={callNext} disabled={!isOpen || data.waitingList.length === 0} style={{ height: 44, fontSize: 14, fontWeight: 800, borderRadius: 12, border: 'none', background: isOpen && data.waitingList.length > 0 ? 'linear-gradient(135deg, var(--amber) 0%, #f0b35a 100%)' : '#e0e5e2', color: isOpen && data.waitingList.length > 0 ? '#16201d' : '#a0a8a3', cursor: isOpen && data.waitingList.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isOpen && data.waitingList.length > 0 ? '0 4px 14px rgba(232, 163, 61, 0.3)' : 'none' }}>
              Call next <ArrowIcon />
            </button>


          </div>

          {/* Right Column: Waiting List */}
          <section className="sq-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20, border: '1px solid var(--line)', background: 'var(--surface)', boxShadow: '0 12px 32px rgba(22, 32, 29, 0.06)', display: 'flex', flexDirection: 'column' }} aria-label="Waiting list">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fcfdfc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Waiting list</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>Customers in line right now</p>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: 'var(--amber-dark)', background: '#fff5e5', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(232, 163, 61, 0.2)' }}>
                {data.waitingList.length} waiting
              </span>
            </div>

            {data.waitingList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f3f1', display: 'grid', placeItems: 'center', color: '#a0a8a3' }}><UsersIcon /></div>
                Nobody's waiting. Share your queue link to get started.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, overflowY: 'auto' }}>
                {data.waitingList.map((entry, index) => (
                  <li key={entry.id} className="sq-queue-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: index < data.waitingList.length - 1 ? '1px solid var(--line)' : 'none', background: index === 0 ? 'rgba(232, 163, 61, 0.03)' : 'transparent' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: index === 0 ? '#fff5e5' : '#f0f3f1', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: index === 0 ? 'var(--amber-dark)' : 'var(--ink)', flexShrink: 0, boxShadow: index === 0 ? '0 4px 10px rgba(232, 163, 61, 0.15)' : 'none' }}>
                      {entry.number}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {entry.customerName}
                        {index === 0 && <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', background: 'var(--amber)', color: '#16201d', padding: '2px 5px', borderRadius: 4 }}>Next</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockIcon /> Waiting {timeAgo(entry.joinedAt)}
                      </div>
                    </div>
                    <button type="button" onClick={() => markCancelled(entry.id)} style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600, borderRadius: 6, height: 30, padding: '0 10px', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c62828'; e.currentTarget.style.color = '#c62828'; e.currentTarget.style.background = 'rgba(198, 40, 40, 0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-soft)'; e.currentTarget.style.background = 'transparent'; }}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default QueueBoard;
