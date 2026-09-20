import { useState, type FC, type FormEvent } from 'react';
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
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.25" y="4" width="15.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m3.25 5.25 6.04 4.62a1.15 1.15 0 0 0 1.42 0l6.04-4.62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="3.25" y="8.25" width="13.5" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.25 8V6.35a3.75 3.75 0 1 1 7.5 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="12.75" r="1" fill="currentColor" />
  </svg>
);

const EyeIcon = ({ crossed = false }: { crossed?: boolean }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2.25 10s2.7-4.25 7.75-4.25S17.75 10 17.75 10 15.05 14.25 10 14.25 2.25 10 2.25 10Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    {crossed && <path d="m3.5 3.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

interface LoginProps {
  onSubmit?: (email: string, password: string) => Promise<void> | void;
  onCreateBusiness?: () => void;
}

const Login: FC<LoginProps> = ({ onSubmit, onCreateBusiness }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit?.(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="sq-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(135deg, #f7f7f2 0%, #eef2e9 100%)', position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden="true" style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'rgba(232,163,61,.13)', top: -190, right: -130 }} />
      <div aria-hidden="true" style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(67,105,81,.08)', bottom: -170, left: -100 }} />

      <div style={{ width: '100%', maxWidth: 920, display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(340px, 1fr)', background: '#fff', border: '1px solid rgba(22,32,29,.08)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 70px rgba(22,32,29,.12)', position: 'relative', zIndex: 1 }}>
        <aside style={{ padding: '48px 42px', background: '#16201d', color: '#f9f7ef', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 490 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 800, letterSpacing: '-.03em', fontSize: 19 }}>
              <TicketMark />
              <span>SmartQueue</span>
            </div>
            <div style={{ marginTop: 70, maxWidth: 270 }}>
              <p style={{ margin: 0, color: '#e8a33d', textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 11, fontWeight: 800 }}>Your day, in order</p>
              <h2 style={{ margin: '14px 0 16px', fontSize: 34, lineHeight: 1.08, letterSpacing: '-.045em' }}>A calmer queue starts here.</h2>
              <p style={{ margin: 0, color: 'rgba(249,247,239,.68)', lineHeight: 1.65, fontSize: 14 }}>Keep your team moving and give every customer a better wait.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(249,247,239,.55)', fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7fc790', boxShadow: '0 0 0 5px rgba(127,199,144,.12)' }} />
            Built for busy businesses
          </div>
        </aside>

        <section style={{ padding: '48px clamp(28px, 6vw, 64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} aria-label="Sign in">
          <div style={{ marginBottom: 30 }}>
            <p style={{ margin: '0 0 9px', color: '#b47720', textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 11, fontWeight: 800 }}>Welcome back</p>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-.04em', color: 'var(--ink, #16201d)' }}>Sign in to your account</h1>
            <p style={{ margin: '11px 0 0', fontSize: 14, color: 'var(--ink-soft, #68736d)', lineHeight: 1.5 }}>Pick up where you left off.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <label className="sq-field">
              <span className="sq-label">Work email</span>
              <span style={{ position: 'relative', display: 'block' }}>
                <MailIcon />
                <input className="sq-input" style={{ paddingLeft: 42, width: '100%', boxSizing: 'border-box' }} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@yourbusiness.com" autoComplete="email" />
              </span>
            </label>

            <label className="sq-field">
              <span className="sq-label">Password</span>
              <span style={{ position: 'relative', display: 'block' }}>
                <LockIcon />
                <input className="sq-input" style={{ paddingLeft: 42, paddingRight: 48, width: '100%', boxSizing: 'border-box' }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Enter your password" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', padding: 7, color: 'var(--ink-soft, #68736d)', cursor: 'pointer' }}>
                  <EyeIcon crossed={!showPassword} />
                </button>
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft, #68736d)', fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#16201d', width: 15, height: 15 }} />
                Remember me
              </label>
              <button type="button" className="sq-btn-quiet" style={{ border: 0, background: 'none', font: '600 12.5px var(--font-ui)', cursor: 'pointer', padding: 0, color: '#a96f1d' }}>Forgot password?</button>
            </div>

            {error && <p className="sq-error" role="alert" style={{ margin: 0 }}>{error}</p>}
            <button type="submit" className="sq-btn sq-btn-primary sq-btn-full" disabled={isSubmitting} style={{ marginTop: 3, minHeight: 46, borderRadius: 10 }}>{isSubmitting ? 'Signing in…' : 'Sign in to SmartQueue'}</button>
          </form>

          <p style={{ margin: '26px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-soft, #68736d)' }}>
            New to SmartQueue?{' '}
            <button type="button" onClick={onCreateBusiness} style={{ border: 0, background: 'none', color: 'var(--ink, #16201d)', fontWeight: 800, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>Create your business</button>
          </p>
        </section>
      </div>
    </main>
  );
};

export default Login;
