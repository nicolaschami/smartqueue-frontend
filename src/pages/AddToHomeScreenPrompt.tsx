import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * AddToHomeScreenPrompt
 *
 * iOS Safari only delivers Web Push to sites installed on the Home Screen,
 * and Apple gives no JS API to trigger that install (unlike Android's
 * `beforeinstallprompt`). This component detects the exact situation where
 * that matters and shows a guided bottom sheet instead.
 *
 * Usage:
 *   const { shouldPrompt } = useIosInstallStatus();
 *   const [open, setOpen] = useState(false);
 *   useEffect(() => { if (shouldPrompt) setOpen(true); }, [shouldPrompt]);
 *
 *   <AddToHomeScreenPrompt open={open} onClose={() => setOpen(false)} />
 *
 * Trigger `open` right after the moment that matters (e.g. right after the
 * customer joins the queue), not on page load.
 */

interface IosInstallStatus {
  isIos: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  shouldPrompt: boolean;
}

// iOS Safari exposes `navigator.standalone`, which isn't in TS's DOM types.
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function useIosInstallStatus(): IosInstallStatus {
  const [status, setStatus] = useState<IosInstallStatus>({
    isIos: false,
    isSafari: false,
    isStandalone: false,
    shouldPrompt: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    // "MSStream" is an old IE-only global; checking with `in` avoids
    // touching a property TS's Window type doesn't declare.
    const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);

    const uaLower = ua.toLowerCase();
    const isSafari =
      uaLower.includes("safari") &&
      !uaLower.includes("crios") &&
      !uaLower.includes("fxios") &&
      !uaLower.includes("android");

    const nav = window.navigator as NavigatorWithStandalone;
    const isStandalone =
      nav.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    setStatus({
      isIos,
      isSafari,
      isStandalone,
      shouldPrompt: isIos && isSafari && !isStandalone,
    });
  }, []);

  return status;
}

interface AddToHomeScreenPromptProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

// Sequence timings (ms) for the auto-playing step highlight + pointer bounce.
// We can't fake Safari's real share sheet here — that's OS chrome sitting on
// top of the page — so the animation's job is just to draw the eye to the
// real Share icon and keep pace with each step, not simulate the OS itself.
const STEP_DURATION_MS = 1800;

export default function AddToHomeScreenPrompt({
  open,
  onClose,
  onConfirm,
}: AddToHomeScreenPromptProps) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [bounce, setBounce] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const playWalkthrough = () => {
    clearTimers();
    setActiveStep(0);
    setBounce(true);
    timers.current.push(
      setTimeout(() => setActiveStep(1), STEP_DURATION_MS),
      setTimeout(() => setActiveStep(2), STEP_DURATION_MS * 2),
      setTimeout(() => setBounce(false), STEP_DURATION_MS * 2 + 900)
    );
  };

  useEffect(() => {
    if (open) playWalkthrough();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Inline styles can't declare @keyframes, so this scoped tag
            carries the one animation the pointer needs. */}
        <style>{`
          @keyframes atts-pointer-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>

        {/* Bouncing pointer aimed toward the real Share icon. Position is a
            best-effort nudge, not a precise callout — Safari's toolbar sits
            at the bottom by default, or the top if the person changed that
            setting, and we have no way to detect which from the page. */}
        <div
          style={{
            ...styles.pointer,
            opacity: bounce ? 1 : 0,
            animation: bounce
              ? "atts-pointer-bounce 0.8s ease-in-out infinite"
              : "none",
          }}
          aria-hidden="true"
        >
          👆
        </div>

        <div style={styles.handle} />
        <div style={styles.head}>
          <div>
            <h3 style={styles.title}>Turn on turn alerts</h3>
            <p style={styles.subtitle}>
              SmartQueue can only send notifications once it's on your Home
              Screen. Watch the highlighted step below.
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <ol style={styles.steps}>
          <Step n={1} active={activeStep === 0}>
            Tap the <b>Share</b> icon in the Safari toolbar
          </Step>
          <Step n={2} active={activeStep === 1}>
            Scroll down and tap <b>Add to Home Screen</b>
          </Step>
          <Step n={3} active={activeStep === 2}>
            Tap <b>Add</b> in the top right corner
          </Step>
        </ol>

        <div style={styles.actions}>
          <button style={styles.ghostBtn} onClick={onClose}>
            Maybe later
          </button>
          <button
            style={styles.primaryBtn}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            I've added it
          </button>
        </div>

        <button style={styles.replayBtn} onClick={playWalkthrough}>
          ▶ Replay the walkthrough
        </button>
      </div>
    </div>
  );
}

function Step({
  n,
  active,
  children,
}: {
  n: number;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <li style={{ ...styles.step, ...(active ? styles.stepActive : {}) }}>
      <span style={styles.stepNum}>{n}</span>
      <span style={styles.stepText}>{children}</span>
    </li>
  );
}

// Typed as Record<string, CSSProperties> so properties like flexDirection,
// textAlign, and position resolve to their proper CSS union types instead
// of plain `string`, which is what causes the pile of TS errors in a .tsx
// file when a plain object literal is used for React's `style` prop.
const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,15,26,0.42)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: "#fff",
    borderRadius: "22px 22px 0 0",
    padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
    boxShadow: "0 -20px 50px rgba(0,0,0,0.2)",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  pointer: {
    position: "absolute",
    top: -34,
    right: 28,
    fontSize: 28,
    transform: "rotate(-8deg)",
    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
    transition: "opacity 0.2s ease",
    pointerEvents: "none",
  },
  replayBtn: {
    display: "block",
    margin: "10px auto 0",
    background: "none",
    border: "none",
    color: "#5B6472",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
  },
  handle: {
    width: 36,
    height: 4,
    background: "#DADFE7",
    borderRadius: 3,
    margin: "0 auto 14px",
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontWeight: 700,
    fontSize: 16.5,
    color: "#0F1B33",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#5B6472",
    lineHeight: 1.5,
    margin: "0 0 16px",
    maxWidth: "34ch",
  },
  closeBtn: {
    background: "#F0F1F4",
    border: "none",
    width: 26,
    height: 26,
    borderRadius: "50%",
    color: "#5B6472",
    fontSize: 14,
    cursor: "pointer",
    flexShrink: 0,
  },
  steps: {
    listStyle: "none",
    margin: "0 0 16px",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#F7F8FA",
    borderRadius: 12,
    padding: "10px 12px",
    transition: "background 0.2s ease, box-shadow 0.2s ease",
  },
  stepActive: {
    background: "rgba(255,182,39,0.18)",
    boxShadow: "inset 0 0 0 1.5px #FFB627",
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#0F1B33",
    color: "#FFB627",
    fontWeight: 700,
    fontSize: 11.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepText: { fontSize: 13, color: "#10131A", lineHeight: 1.4 },
  actions: { display: "flex", gap: 10 },
  primaryBtn: {
    flex: 1,
    fontWeight: 600,
    fontSize: 13.5,
    padding: "13px 12px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#0F1B33",
    color: "#fff",
  },
  ghostBtn: {
    flex: 1,
    fontWeight: 600,
    fontSize: 13.5,
    padding: "13px 12px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#F0F1F4",
    color: "#5B6472",
  },
};
