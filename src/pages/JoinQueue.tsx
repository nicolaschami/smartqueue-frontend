//Public Key:
//BGcjGydhUgReai9zg7QnWfShdsJ4stY6FA5q211KOEneL5Cks6kF6MpXkzTrOyUJK7IHaTrURigRQ4QGQC1JrQI

//Private Key:
//cSx4f7tOQu1V94QtVuHu8ActiVvZfx-rdLyPZZUTNoI

//=======================================
import { useEffect, useState, type FC } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/theme.css';
import { supabase } from '../lib/supabase';

interface JoinQueueProps {
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

const TicketIcon = () => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    style={{ width: 28, height: 28 }}
  >
    <path
      d="M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3.5a2 2 0 0 0 0 4V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a2 2 0 0 0 0-4V8Z"
      fill="currentColor"
    />
    <rect
      x="12"
      y="12"
      width="8"
      height="1.6"
      rx=".8"
      fill="var(--amber)"
    />
  </svg>
);

const BellIcon = () => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    style={{ width: 28, height: 28 }}
  >
    <path
      d="M16 28a3.5 3.5 0 0 0 3.3-2.3h-6.6A3.5 3.5 0 0 0 16 28Z"
      fill="currentColor"
    />
    <path
      d="M25 22H7c1.5-1.8 2.2-3.7 2.2-6.2V13a6.8 6.8 0 0 1 13.6 0v2.8c0 2.5.7 4.4 2.2 6.2Z"
      fill="currentColor"
    />
  </svg>
);

export const JoinQueue: FC<JoinQueueProps> = ({
  queueId = 'edb5b42d-34dd-47a5-82d9-551efab650d4',
  //apiBaseUrl = 'http://localhost:3000',
  apiBaseUrl = `${API_BASE_URL}/api`, // Uses your dynamic base URL
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<JoinedTicket | null>(null);

  // Notification popup state
  const [showNotificationPrompt, setShowNotificationPrompt] =
    useState(false);

  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermission | null>(null);

  const endpointUrl = `${apiBaseUrl}/api/queues/${queueId}/entries`;

  // Constant values sent automatically
  const DEFAULT_CUSTOMER_NAME = 'Walk-in Guest';
  const DEFAULT_CUSTOMER_PHONE = 'N/A';

  /*
   * ============================================================
   * SUPABASE REALTIME LISTENER
   * ============================================================
   *
   * Once we have a ticket, listen for changes to the
   * customer_notifications row belonging to that ticket.
   */
  useEffect(() => {
    if (!ticket?.entry.id) {
      return;
    }

    console.log(
      'Starting notification listener for:',
      ticket.entry.id
    );

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
          console.log(
            'Notification update received:',
            payload
          );

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
      .subscribe((status) => {
        console.log(
          'Notification listener status:',
          status
        );
      });

    return () => {
      console.log(
        'Removing notification listener for:',
        ticket.entry.id
      );

      supabase.removeChannel(channel);
    };
  }, [ticket?.entry.id]);

  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: DEFAULT_CUSTOMER_NAME,
          customerPhone: DEFAULT_CUSTOMER_PHONE,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to join queue.'
        );
      }

      // Ticket successfully created
      setTicket(data);

      // Show notification prompt after ticket is generated
      setShowNotificationPrompt(true);
    } catch (err: any) {
      setError(
        err.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start over and get another ticket.
   * (Declared above handleEnableNotifications so it can be
   * referenced there without worrying about ordering — it's
   * a `const` function, but since it's only ever called from
   * inside event handlers invoked later, this works fine.)
   */
  const handleGetAnotherTicket = () => {
    setTicket(null);
    setShowNotificationPrompt(false);
    setNotificationStatus(null);
    setError(null);
  };

  /**
   * Ask the browser for notification permission.
   */
  const handleEnableNotifications = async () => {
    // Browser does not support notifications
    if (!('Notification' in window)) {
      setNotificationStatus('denied');
      setShowNotificationPrompt(false);

      setError(
        'Notifications are not supported by this browser.'
      );

      return;
    }

    try {
      const permission = await Notification.requestPermission();
      const registration =
      await navigator.serviceWorker.register('/sw.js');
      console.log('🟢 Service Worker registered:', registration);
      const vapidPublicKey =   import.meta.env.VITE_VAPID_PUBLIC_KEY;

const subscription =
  await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });

console.log('🟢 Push subscription:', subscription);



      //



      console.log('🟢 Service Worker registered:', registration);
      setNotificationStatus(permission);

      if (permission === 'granted') {
  if (!ticket?.entry.id) {
    throw new Error('No queue ticket found.');
  }

 const response = await fetch('http://localhost:3000/api/notifications/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  queueEntryId: ticket.entry.id,
  permission: 'granted',
  subscription: subscription.toJSON(),
}),
});

 const data = await response.text();

console.log('🔵 Notification API status:', response.status);
console.log('🔵 Notification API response:', data);

  if (!response.ok) {
  throw new Error(
    `Notification API failed (${response.status}): ${data}`
  );
}

const result = JSON.parse(data);

console.log('🟢 Notification API success  :: --->', result);

if ('Notification' in window && Notification.permission === 'granted') {
  const notification = new Notification('Welcome to the queue! 🔔', {
    body: 'You have joined the queue successfully. We’ll keep you updated about your turn.',
  });

  console.log('Browser notification created:', notification);
} else {
  console.log('Notifications are not granted.');
}

  // Go straight back to the Join Queue view instead of
  // showing the "Notifications enabled" state on the ticket.
  handleGetAnotherTicket();
}

      if (permission === 'denied') {
        setShowNotificationPrompt(false);
      }

      if (permission === 'default') {
        setShowNotificationPrompt(false);
      }
    } catch (err) {
      console.error(
        'Notification permission error:',
        err
      );

      setShowNotificationPrompt(false);
    }
  };

  /**
   * Customer chooses "Not now".
   */
  const handleNotNow = () => {
    setShowNotificationPrompt(false);
  };

  return (
    <main
      className="sq-page"
      style={{
        padding: '40px 20px',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
        }}
      >
        {/* Brand Header */}
        <header
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div
            className="sq-mark"
            style={{
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <span
              className="sq-mark-icon"
              style={{
                color: 'var(--ink)',
              }}
            >
              <TicketIcon />
            </span>

            <span className="sq-mark-word">
              SmartQueue
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--ink-soft)',
            }}
          >
            Scan the QR code or click below to enter
            the line
          </p>
        </header>

        {ticket ? (
          /*
           * ============================================
           * TICKET GENERATED VIEW
           * ============================================
           */
          <div
            className="sq-card"
            style={{
              padding: 28,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--green)',
                marginBottom: 8,
              }}
            >
              ✓ TICKET GENERATED
            </div>

            <div
              className="sq-display"
              style={{
                margin: '16px 0',
              }}
            >
              <p className="sq-display-label">
                Your Ticket Number
              </p>

              <span className="sq-display-number">
                {ticket.entry.numberLabel}
              </span>

              <p className="sq-display-sub">
                {ticket.position === 1
                  ? "You're next in line!"
                  : `${ticket.position - 1} people ahead of you`}
              </p>
            </div>

            {/* NOTIFICATION PROMPT */}

            {showNotificationPrompt && (
              <div
                style={{
                  marginTop: 24,
                  marginBottom: 20,
                  padding: 20,
                  borderRadius: 14,
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    margin: '0 auto 14px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--amber)',
                    color: 'var(--ink)',
                  }}
                >
                  <BellIcon />
                </div>

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    marginBottom: 8,
                  }}
                >
                  Don't miss your turn
                </div>

                <p
                  style={{
                    margin: '0 auto 18px',
                    maxWidth: 330,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--ink-soft)',
                  }}
                >
                  Get a notification when you're getting
                  close to the front of the queue.
                </p>

                <button
                  type="button"
                  className="sq-btn sq-btn-amber sq-btn-full"
                  style={{
                    height: 48,
                    fontSize: 15,
                  }}
                  onClick={handleEnableNotifications}
                >
                  Enable Notifications
                </button>

                <button
                  type="button"
                  className="sq-btn sq-btn-quiet sq-btn-full"
                  style={{
                    marginTop: 8,
                    height: 42,
                  }}
                  onClick={handleNotNow}
                >
                  Not Now
                </button>
              </div>
            )}

            {/* Notification enabled message */}

            {!showNotificationPrompt &&
              notificationStatus === 'granted' && (
                <div
                  style={{
                    marginTop: 20,
                    marginBottom: 20,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--green-soft)',
                    color: 'var(--green)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✓ Notifications enabled
                </div>
              )}

            <button
              type="button"
              className="sq-btn sq-btn-quiet sq-btn-full"
              onClick={handleGetAnotherTicket}
            >
              Get Another Ticket
            </button>
          </div>
        ) : (
          /*
           * ============================================
           * QR & JOIN VIEW
           * ============================================
           */
          <div
            className="sq-card"
            style={{
              padding: 28,
              textAlign: 'center',
            }}
          >
            {/* QR Code */}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 20,
                background: 'var(--paper)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                marginBottom: 20,
              }}
            >
              <QRCodeSVG
                value={endpointUrl}
                size={180}
                level="M"
                includeMargin={true}
              />

              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-soft)',
                  marginTop: 10,
                  wordBreak: 'break-all',
                }}
              >
                {queueId}
              </span>
            </div>

            {/* Error */}

            {error && (
              <div
                className="sq-error"
                style={{
                  padding: '10px 14px',
                  background: 'var(--red-soft)',
                  borderRadius: 8,
                  marginBottom: 18,
                  textAlign: 'left',
                }}
              >
                {error}
              </div>
            )}

            {/* Join Queue */}

            <button
              type="button"
              className="sq-btn sq-btn-amber sq-btn-full"
              style={{
                height: 50,
                fontSize: 16,
              }}
              onClick={handleJoinQueue}
              disabled={loading}
            >
              {loading
                ? 'Joining Queue...'
                : 'Join Queue'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default JoinQueue;
