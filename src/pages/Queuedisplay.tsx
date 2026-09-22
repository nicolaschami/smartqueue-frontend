import { useEffect, useRef, useState, useMemo, type FC } from 'react';
import '../styles/theme.css';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../api';
import AddToHomeScreenPrompt, {
  useIosInstallStatus,
} from './AddToHomeScreenPrompt';

interface QueueDisplayProps {
  queueId?: string;
  apiBaseUrl?: string;
}

interface JoinedTicket {
  entry: {
    id: string;
    numberLabel: string;
    customerName: string | null;
  };
  position: number;
}

const BellIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: 26, height: 26 }}>
    <path d="M16 28a3.5 3.5 0 0 0 3.3-2.3h-6.6A3.5 3.5 0 0 0 16 28Z" fill="currentColor" />
    <path
      d="M25 22H7c1.5-1.8 2.2-3.7 2.2-6.2V13a6.8 6.8 0 0 1 13.6 0v2.8c0 2.5.7 4.4 2.2 6.2Z"
      fill="currentColor"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 16, height: 16 }}>
    <path
      d="M4 10.5l3.5 3.5L16 6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PENDING_TICKET_KEY = 'sq_pending_ticket';

const FlipChar: FC<{ char: string; delayMs: number }> = ({ char, delayMs }) => (
  <span
    style={{
      display: 'inline-block',
      animation: `sqFlipIn 520ms cubic-bezier(.2,.8,.2,1) both`,
      animationDelay: `${delayMs}ms`,
    }}
  >
    {char}
  </span>
);

export const QueueDisplay: FC<QueueDisplayProps> = ({
  queueId: propQueueId,
  apiBaseUrl = `${API_BASE_URL}/`,
}) => {
  // Extract queueId from URL search params (?queueId=...) falling back to props or default
  const activeQueueId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlQueueId = searchParams.get('queueId');
      if (urlQueueId) return urlQueueId;
    }
    return propQueueId || 'edb5b42d-34dd-47a5-82d9-551efab650d4';
  }, [propQueueId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<JoinedTicket | null>(null);
  const previousPosition = useRef<number | null>(null);

  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermission | null>(null);

  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false);
  const { shouldPrompt: needsHomeScreenInstall, isStandalone } = useIosInstallStatus();

  // Dynamic endpoint based on active URL queueId
  const endpointUrl = `${apiBaseUrl}api/queues/${activeQueueId}/entries`;

  const DEFAULT_CUSTOMER_NAME = 'Walk-in Guest';
  const DEFAULT_CUSTOMER_PHONE = 'N/A';

  // Restore a pending ticket after the iOS Home Screen install jump.
  useEffect(() => {
    if (!isStandalone) return;
    const stored = localStorage.getItem(PENDING_TICKET_KEY);
    if (!stored) return;
    try {
      const restored: JoinedTicket = JSON.parse(stored);
      setTicket(restored);
      setShowNotificationPrompt(true);
    } catch (err) {
      console.error('Failed to restore pending ticket:', err);
    } finally {
      localStorage.removeItem(PENDING_TICKET_KEY);
    }
  }, [isStandalone]);

  // Realtime listener for status updates on this ticket.
  useEffect(() => {
    if (!ticket?.entry.id) return;

    const channel = supabase
      .channel(`customer-notifications-${ticket.entry.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_notifications',
          filter: `queue_entry_id=eq.${ticket.entry.id}`,
        },
        (payload) => {
          if (
            payload.new &&
            typeof payload.new === 'object' &&
            'enabled' in payload.new &&
            payload.new.enabled === true
          ) {
            if ('Notification' in window) {
              new Notification('Queue update', {
                body: 'Your queue status has been updated.',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.entry.id]);

  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: DEFAULT_CUSTOMER_NAME,
          customerPhone: DEFAULT_CUSTOMER_PHONE,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join queue.');
      }

      previousPosition.current = null;
      setTicket(data);

      if (needsHomeScreenInstall) {
        localStorage.setItem(PENDING_TICKET_KEY, JSON.stringify(data));
        setShowAddToHomeScreen(true);
      } else {
        setShowNotificationPrompt(true);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAnotherTicket = () => {
    setTicket(null);
    setShowNotificationPrompt(false);
    setShowAddToHomeScreen(false);
    setNotificationStatus(null);
    setError(null);
    localStorage.removeItem(PENDING_TICKET_KEY);
  };

  const handleAddToHomeScreenConfirm = () => {
    setShowAddToHomeScreen(false);
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('denied');
      setShowNotificationPrompt(false);
      setError('Notifications are not supported by this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setNotificationStatus(permission);
        setShowNotificationPrompt(false);
        return;
      }

      const activeRegistration = await navigator.serviceWorker.ready;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VITE_VAPID_PUBLIC_KEY is not configured.');
      }

      const subscription = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setNotificationStatus(permission);

      if (!ticket?.entry.id) {
        throw new Error('No queue ticket found.');
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueEntryId: ticket.entry.id,
          permission: 'granted',
          subscription: subscription.toJSON(),
        }),
      });

      const data = await response.text();

      if (!response.ok) {
        throw new Error(`Notification API failed (${response.status}): ${data}`);
      }

      JSON.parse(data);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Welcome to the queue', {
          body: "You've joined the queue. We'll keep you updated as your turn gets closer.",
        });
      }

      handleGetAnotherTicket();
    } catch (err) {
      console.error('Notification permission error:', err);
      setShowNotificationPrompt(false);
    }
  };

  const handleNotNow = () => {
    setShowNotificationPrompt(false);
  };

  const progressPercent = ticket
    ? ticket.position <= 1
      ? 100
      : Math.min(92, Math.round((1 / ticket.position) * 100) + 8)
    : 0;

  const numberChars = ticket ? ticket.entry.numberLabel.split('') : [];

  return (
    <main className="sq-page sq-display-page">
      <style>{`
        @keyframes sqFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes sqGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,166,35,.22); }
          50% { box-shadow: 0 0 0 12px rgba(245,166,35,0); }
        }
        @keyframes sqFlipIn {
          0% { opacity: 0; transform: translateY(14px) rotateX(55deg); }
          100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
        @keyframes sqBarFill { from { width: 0%; } }
        .sq-display-page {
          min-height: 100dvh;
          padding: 24px 16px 32px;
          color: #fff;
          background:
            radial-gradient(80% 50% at 50% -8%, rgba(245,166,35,.20), transparent 70%),
            radial-gradient(55% 45% at 100% 100%, rgba(72,187,145,.10), transparent 70%),
            var(--ink);
        }
        .sq-display-shell { width: 100%; max-width: 470px; margin: 0 auto; }
        .sq-display-brand { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 26px; }
        .sq-display-brand-mark { display: flex; align-items: center; gap: 10px; }
        .sq-display-brand-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 0 6px rgba(245,166,35,.13); }
        .sq-display-brand-name { font-size: 18px; font-weight: 850; letter-spacing: -.02em; }
        .sq-live-pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; color: rgba(255,255,255,.72); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .sq-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #63d8a5; animation: sqGlow 2s ease-in-out infinite; }
        .sq-display-card { overflow: hidden; border: 1px solid rgba(255,255,255,.12); border-radius: 28px; background: linear-gradient(150deg, rgba(255,255,255,.98), rgba(248,245,239,.98)); box-shadow: 0 24px 80px rgba(0,0,0,.28); }
        .sq-display-card-top { padding: 30px 24px 24px; text-align: center; }
        .sq-check-badge { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; background: var(--green-soft); color: var(--green); font-size: 12px; font-weight: 850; letter-spacing: .03em; }
        .sq-display-kicker { margin: 24px 0 5px; color: var(--ink-soft); font-size: 13px; font-weight: 650; }
        .sq-display-number { margin: 0; color: var(--ink); font-family: var(--font-mono, monospace); font-size: clamp(64px, 18vw, 92px); font-weight: 900; line-height: .98; letter-spacing: .04em; }
        .sq-number-caption { margin: 10px 0 0; color: var(--ink-soft); font-size: 13px; }
        .sq-position-panel { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; margin-top: 28px; padding: 16px; border-radius: 18px; background: #fff; border: 1px solid var(--line); text-align: left; }
        .sq-position-label { margin: 0 0 5px; color: var(--ink-soft); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .sq-position-copy { margin: 0; color: var(--ink); font-size: 16px; font-weight: 850; }
        .sq-position-count { display: grid; place-items: center; min-width: 58px; height: 58px; padding: 0 8px; border-radius: 16px; background: var(--ink); color: var(--amber); font-family: var(--font-mono, monospace); font-size: 24px; font-weight: 900; }
        .sq-progress-track { height: 8px; margin-top: 16px; overflow: hidden; border-radius: 999px; background: var(--line); }
        .sq-progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e59a14, var(--amber)); animation: sqBarFill 900ms ease-out; transition: width 500ms ease-out; }
        .sq-display-divider { height: 1px; margin: 0 24px; background: var(--line); }
        .sq-display-card-bottom { padding: 22px 24px 24px; }
        .sq-next-hint { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 18px; color: var(--ink-soft); font-size: 13px; line-height: 1.45; text-align: left; }
        .sq-next-hint-icon { display: grid; flex: 0 0 28px; place-items: center; width: 28px; height: 28px; border-radius: 10px; background: var(--amber-soft, #fff3d7); color: var(--ink); font-weight: 900; }
        .sq-notification-panel { padding: 20px; border-radius: 20px; background: var(--ink); text-align: center; }
        .sq-notification-icon { display: grid; place-items: center; width: 50px; height: 50px; margin: 0 auto 13px; border-radius: 16px; background: var(--amber); color: var(--ink); animation: sqFloat 2.8s ease-in-out infinite; }
        .sq-notification-title { margin-bottom: 7px; color: #fff; font-size: 16px; font-weight: 850; }
        .sq-notification-copy { max-width: 300px; margin: 0 auto 18px; color: rgba(255,255,255,.63); font-size: 13px; line-height: 1.5; }
        .sq-success-note { margin-bottom: 18px; padding: 12px 14px; border-radius: 13px; background: var(--green-soft); color: var(--green); font-size: 13px; font-weight: 800; }
        .sq-display-footer { margin-top: 18px; color: rgba(255,255,255,.48); font-size: 12px; text-align: center; }
        .sq-empty-card { padding: 34px 24px 26px; text-align: center; }
        .sq-empty-orb { display: grid; place-items: center; width: 74px; height: 74px; margin: 0 auto 20px; border-radius: 24px; background: var(--ink); color: var(--amber); font-family: var(--font-mono, monospace); font-size: 28px; font-weight: 900; transform: rotate(-5deg); }
        .sq-empty-title { margin: 0 0 8px; color: var(--ink); font-size: 24px; font-weight: 900; letter-spacing: -.03em; }
        .sq-empty-copy { max-width: 300px; margin: 0 auto 24px; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
        .sq-error { color: var(--red, #b44343); }
        @media (max-width: 559px) {
          .sq-notification-panel {
            position: fixed;
            z-index: 50;
            left: 12px;
            right: 12px;
            bottom: max(12px, env(safe-area-inset-bottom));
            padding: 18px;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 22px;
            box-shadow: 0 -18px 60px rgba(0,0,0,.38), 0 18px 55px rgba(0,0,0,.28);
          }
          .sq-notification-icon { width: 42px; height: 42px; margin-bottom: 10px; border-radius: 13px; }
          .sq-notification-copy { margin-bottom: 14px; }
        }
        @media (min-width: 560px) { .sq-display-page { padding-top: 42px; } .sq-display-card-top { padding: 36px 38px 28px; } .sq-display-card-bottom { padding: 24px 38px 30px; } .sq-display-divider { margin: 0 38px; } }
        @media (prefers-reduced-motion: reduce) { .sq-display-page *, .sq-display-page *::before, .sq-display-page *::after { animation: none !important; transition: none !important; } }
      `}</style>

      <div className="sq-display-shell">
        <header className="sq-display-brand">
          <div className="sq-display-brand-mark">
            <span className="sq-display-brand-dot" aria-hidden="true" />
            <span className="sq-display-brand-name">SmartQueue</span>
          </div>
          <div className="sq-live-pill"><span className="sq-live-dot" aria-hidden="true" /> Live</div>
        </header>

        {ticket ? (
          <section className="sq-display-card" aria-live="polite">
            <div className="sq-display-card-top">
              <div className="sq-check-badge"><CheckIcon /> You're checked in</div>
              <p className="sq-display-kicker">Your place in line</p>
              <div className="sq-display-number sq-flip-wrap">
                {numberChars.map((c, i) => (
                  <FlipChar key={`${c}-${i}-${ticket.entry.numberLabel}`} char={c} delayMs={i * 70} />
                ))}
              </div>
              <p className="sq-number-caption">Keep this number handy — we’ll let you know when it’s your turn.</p>

              <div className="sq-position-panel">
                <div>
                  <p className="sq-position-label">Queue status</p>
                  <p className="sq-position-copy">
                    {ticket.position === 1 ? 'You’re next!' : 'Moving up nicely'}
                  </p>
                </div>
                <div className="sq-position-count" aria-label={`${Math.max(ticket.position - 1, 0)} people ahead`}>
                  {Math.max(ticket.position - 1, 0)}
                </div>
              </div>
              <div className="sq-progress-track" aria-label="Progress toward the front of the queue">
                <div className="sq-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="sq-display-divider" />
            <div className="sq-display-card-bottom">
              <div className="sq-next-hint">
                <span className="sq-next-hint-icon" aria-hidden="true">→</span>
                <span>
                  {ticket.position === 1
                    ? 'Please head to the service desk now. You’re at the front of the line.'
                    : `${ticket.position - 1} ${ticket.position - 1 === 1 ? 'person is' : 'people are'} ahead of you. Feel free to take a seat.`}
                </span>
              </div>

              <AddToHomeScreenPrompt
                open={showAddToHomeScreen}
                onClose={() => setShowAddToHomeScreen(false)}
                onConfirm={handleAddToHomeScreenConfirm}
              />

              {showNotificationPrompt && (
                <div className="sq-notification-panel">
                  <div className="sq-notification-icon"><BellIcon /></div>
                  <div className="sq-notification-title">Want a gentle reminder?</div>
                  <p className="sq-notification-copy">We’ll let you know when your turn is getting close, so you can relax.</p>
                  <button type="button" className="sq-btn sq-btn-amber sq-btn-full" style={{ height: 48 }} onClick={handleEnableNotifications}>
                    Turn on notifications
                  </button>
                  <button type="button" className="sq-btn sq-btn-quiet sq-btn-full" style={{ marginTop: 8, height: 40, color: 'rgba(255,255,255,.65)' }} onClick={handleNotNow}>
                    Maybe later
                  </button>
                </div>
              )}

              {!showNotificationPrompt && notificationStatus === 'granted' && (
                <div className="sq-success-note">✓ Notifications are on — we’ll keep watch for you.</div>
              )}

              <button type="button" className="sq-btn sq-btn-quiet sq-btn-full" style={{ marginTop: showNotificationPrompt ? 18 : 0 }} onClick={handleGetAnotherTicket}>
                Take another number
              </button>
            </div>
          </section>
        ) : (
          <section className="sq-display-card">
            <div className="sq-empty-card">
              <div className="sq-empty-orb" aria-hidden="true">Q</div>
              <h1 className="sq-empty-title">Your turn starts here</h1>
              <p className="sq-empty-copy">Take a number and keep your place without standing in line. We’ll show you exactly where you are.</p>

              {error && (
                <div className="sq-error" style={{ padding: '11px 14px', background: 'var(--red-soft)', borderRadius: 10, marginBottom: 18, textAlign: 'left', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button type="button" className="sq-btn sq-btn-amber sq-btn-full" style={{ height: 54, fontSize: 16 }} onClick={handleJoinQueue} disabled={loading}>
                {loading ? 'Joining queue…' : 'Take my number'}
              </button>
            </div>
          </section>
        )}

        <p className="sq-display-footer">You can keep this page open while you wait.</p>
      </div>
    </main>
  );
};

export default QueueDisplay;