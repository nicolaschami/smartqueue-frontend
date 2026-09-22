import { useEffect, useState, type FC, type FormEvent } from 'react';
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

const MailIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}>
    <rect x="2.25" y="4" width="15.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m3.25 5.25 6.04 4.62a1.15 1.15 0 0 0 1.42 0l6.04-4.62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}>
    <rect x="3.25" y="8.25" width="13.5" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.25 8V6.35a3.75 3.75 0 1 1 7.5 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="12.75" r="1" fill="currentColor" />
  </svg>
);

const EyeIcon = ({ crossed = false }: { crossed?: boolean }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 18, height: 18 }}>
    <path d="M2.25 10s2.7-4.25 7.75-4.25S17.75 10 17.75 10 15.05 14.25 10 14.25 2.25 10 2.25 10Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    {crossed && <path d="m3.5 3.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

interface LoginProps {
  onSubmit?: (username: string, password: string) => Promise<void> | void;
  onCreateBusiness?: () => void;
  onLoginSuccess?: (data: Record<string, unknown>) => void;
}

const API_LOGIN_URL = 'https://smartqueue-server.onrender.com/api/business/login';

const BOARD_TICKETS = [
  { now: 'B-042', next: [{ code: 'B-043', label: 'Ana R.' }, { code: 'B-044', label: 'Diego M.' }] },
  { now: 'B-045', next: [{ code: 'B-046', label: 'Priya S.' }, { code: 'B-047', label: 'Tom L.' }] },
  { now: 'B-048', next: [{ code: 'B-049', label: 'Marta V.' }, { code: 'B-050', label: 'Yuki H.' }] },
];

export const Login: FC<LoginProps> = ({ onSubmit, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticketIndex, setTicketIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTicketIndex((i) => (i + 1) % BOARD_TICKETS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError('Enter your username and password to continue.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(API_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Login failed (${response.status})`);
      }

      const token = responseData.token || responseData.accessToken || 'authenticated';

      // --- SAVE SESSION DATA ACCORDING TO REMEMBER ME ---
      if (rememberMe) {
        // Persists across browser closes
        localStorage.setItem('authToken', token);
        localStorage.setItem('sq_client_payload', JSON.stringify(responseData));
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('sq_client_payload');
      } else {
        // Clears when browser tab is closed
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('sq_client_payload', JSON.stringify(responseData));
        localStorage.removeItem('authToken');
        localStorage.removeItem('sq_client_payload');
      }

      await onSubmit?.(cleanUsername, password);
      onLoginSuccess?.(responseData);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign in. Check your details and try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const board = BOARD_TICKETS[ticketIndex];

  return (
    <main className="sq-page sq-login-shell">
      <style>{`
        /* Field wrapper positioning context */
        .sq-field-icon-wrap {
          position: relative !important;
          display: block !important;
          width: 100% !important;
        }

        /* Left icon (mail / lock) */
        .sq-field-left-icon {
          position: absolute !important;
          left: 16px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          pointer-events: none !important;
          color: var(--ink-soft, #888) !important;
          z-index: 2 !important;
        }

        /* Input padding for icons */
        .sq-field-input {
          width: 100% !important;
          box-sizing: border-box !important;
          padding-left: 52px !important;
          padding-right: 56px !important;
        }

        /* Eye button anchored strictly inside right edge */
        .sq-eye-btn {
          position: absolute !important;
          right: 14px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          margin: 0 !important;
          width: 28px !important;
          height: 28px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          cursor: pointer !important;
          color: var(--ink-soft, #666) !important;
          border-radius: 6px !important;
          z-index: 3 !important;
          line-height: 0 !important;
        }

        .sq-eye-btn:hover {
          color: var(--ink, #111) !important;
        }

        .sq-eye-btn:focus-visible {
          outline: 2px solid var(--accent, #e8a33d) !important;
          outline-offset: 1px !important;
        }

        /* WhatsApp link styling */
        .sq-whatsapp-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          color: var(--ink-soft, #444);
          font-size: 14px;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .sq-whatsapp-link:hover {
          opacity: 0.85;
          text-decoration: none;
        }
      `}</style>

      <div className="sq-login-card">
        <aside className="sq-login-aside">
          <div>
            <div className="sq-login-brand">
              <TicketMark />
              <span>SmartQueue</span>
            </div>

            <div className="sq-hero-board" style={{ marginTop: 32 }}>
              <p className="sq-hero-label">Now serving</p>
              <span key={ticketIndex} className="sq-hero-number sq-flip">{board.now}</span>

              <div className="sq-hero-tear" />

              <div className="sq-hero-next">
                {board.next.map((row) => (
                  <div className="sq-hero-row" key={row.code}>
                    <span><span className="sq-hero-row-code">{row.code}</span>{row.label}</span>
                    <span>waiting</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sq-login-copy" style={{ marginTop: 28 }}>
              <h2>A calmer queue starts here.</h2>
              <p>Keep your team moving and give every customer a better wait.</p>
            </div>
          </div>

          <div className="sq-login-status">
            <span className="sq-login-status-dot" />
            All queues running smoothly
          </div>
        </aside>

        <section className="sq-login-form-section" aria-label="Sign in">
          <h1 className="sq-login-heading">Welcome back</h1>
          <p className="sq-login-subheading">Sign in to keep your line moving.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <div className="sq-field">
              <label className="sq-label" htmlFor="sq-username">Username</label>
              <div className="sq-field-icon-wrap">
                <span className="sq-field-left-icon"><MailIcon /></span>
                <input
                  id="sq-username"
                  className="sq-input sq-field-input"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="sq-field">
              <label className="sq-label" htmlFor="sq-password">Password</label>
              <div className="sq-field-icon-wrap">
                <span className="sq-field-left-icon"><LockIcon /></span>
                <input
                  id="sq-password"
                  className="sq-input sq-field-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="sq-eye-btn"
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </div>

            <div className="sq-login-row">
              <label className="sq-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              
            </div>

            {error && <p className="sq-error" role="alert" style={{ margin: 0 }}>{error}</p>}

            <button type="submit" className="sq-btn sq-btn-primary sq-btn-full" disabled={isSubmitting} style={{ marginTop: 3, minHeight: 46, borderRadius: 10 }}>
              {isSubmitting ? 'Signing in…' : 'Sign in to SmartQueue'}
            </button>
          </form>

          <p className="sq-login-footer" style={{ marginTop: 24, textAlign: 'center' }}>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noreferrer"
              className="sq-whatsapp-link"
              aria-label="Forgot your account(username or password)? Chat with us on WhatsApp"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="#25D366"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Forgot your account? Chat with us</span>
            </a>
          </p>
        </section>
      </div>
    </main>
  );
};

export default Login;