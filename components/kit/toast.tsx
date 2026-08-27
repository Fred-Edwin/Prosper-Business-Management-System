// NEW primitive (Session 10 Deliverable 3d) — needs owner review in Storybook.
// NO Paper artboard — this has REAL layout decisions, surfaced for sign-off.
//
// The gap it fills: there is no success/feedback primitive. "Correction saved" /
// "Payment recorded" is currently silent — the drawer just closes.
//
// Design choices made here (owner: confirm on review):
//   - role="status" region, aria-live="polite" (non-interruptive; an error toast
//     can pass `assertive`)
//   - placement: "top-right" (admin, desktop) | "bottom-center" (staff, mobile).
//     Set once on <ToastProvider placement=…>. Default "top-right".
//   - --z-toast (1500) — above every overlay
//   - auto-dismiss after `duration` (default 4000ms), PAUSED while the pointer is
//     over the stack or a toast has focus (WCAG 2.2.1 — user can extend)
//   - enter/exit: transform slide (--dur-base), opacity — allow-list only, no
//     bounce (§1). NO reduced-motion special-casing (owner D4).
//   - stacks: newest nearest the screen edge; max 4 visible, older ones drop
//   - tone: "info" (default, neutral) | "success" | "danger" — a hairline left
//     border in the semantic color + matching icon; body stays --text-primary
//
// API: wrap the app (or a subtree) in <ToastProvider>; call `toast()` from the
// `useToast()` hook.  const { toast } = useToast();  toast("Correction saved");
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToastTone = "info" | "success" | "danger";
export type ToastPlacement = "top-right" | "bottom-center";

export interface ToastOptions {
  tone?: ToastTone;
  /** ms before auto-dismiss. 0 = sticky (must be dismissed). Default 4000. */
  duration?: number;
}

interface ToastRecord extends Required<ToastOptions> {
  id: number;
  message: React.ReactNode;
}

interface ToastContextValue {
  toast: (message: React.ReactNode, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}

const MAX_VISIBLE = 4;

const TONE_ICON: Record<ToastTone, React.ReactNode> = {
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
      <line x1="12" y1="11" x2="12" y2="16" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M20 6 9 17l-5-5" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const TONE_BORDER: Record<ToastTone, string> = {
  info: "[border-left-color:var(--color-info)]",
  success: "[border-left-color:var(--color-success)]",
  danger: "[border-left-color:var(--color-danger)]",
};

export function ToastProvider({
  children,
  placement = "top-right",
}: {
  children: React.ReactNode;
  placement?: ToastPlacement;
}) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const nextId = React.useRef(1);
  const paused = React.useRef(false);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const arm = React.useCallback(
    (rec: ToastRecord) => {
      if (rec.duration <= 0 || paused.current) return;
      const timer = setTimeout(() => dismiss(rec.id), rec.duration);
      timers.current.set(rec.id, timer);
    },
    [dismiss],
  );

  const toast = React.useCallback(
    (message: React.ReactNode, opts?: ToastOptions) => {
      const rec: ToastRecord = {
        id: nextId.current++,
        message,
        tone: opts?.tone ?? "info",
        duration: opts?.duration ?? 4000,
      };
      setToasts((list) => [...list, rec].slice(-MAX_VISIBLE));
      arm(rec);
      return rec.id;
    },
    [arm],
  );

  // Pause every pending timer while hovered/focused; re-arm on leave.
  const pauseAll = React.useCallback(() => {
    paused.current = true;
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);
  const resumeAll = React.useCallback(() => {
    paused.current = false;
    for (const rec of toasts) arm(rec);
  }, [toasts, arm]);

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const posCls =
    placement === "bottom-center"
      ? "bottom-(--sp-7) left-1/2 -translate-x-1/2 items-center"
      : "top-(--sp-7) right-(--sp-7) items-end";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            data-overlay-ignore-inert
            role="status"
            aria-live="polite"
            aria-atomic="false"
            onMouseEnter={pauseAll}
            onMouseLeave={resumeAll}
            onFocusCapture={pauseAll}
            onBlurCapture={resumeAll}
            className={cn(
              "fixed flex flex-col gap-(--sp-4) [z-index:var(--z-toast)] pointer-events-none",
              posCls,
            )}
          >
            {toasts.map((t) => (
              <ToastItem
                key={t.id}
                record={t}
                placement={placement}
                onDismiss={() => dismiss(t.id)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  record,
  placement,
  onDismiss,
}: {
  record: ToastRecord;
  placement: ToastPlacement;
  onDismiss: () => void;
}) {
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const offAxis =
    placement === "bottom-center"
      ? entered
        ? "translate-y-0"
        : "translate-y-[8px]"
      : entered
        ? "translate-x-0"
        : "translate-x-[8px]";

  return (
    <div
      className={cn(
        "[font-synthesis:none] pointer-events-auto flex items-start gap-(--sp-4) w-[320px] max-w-[calc(100vw-var(--sp-8))] p-(--sp-5) rounded-md",
        "bg-(--surface-raised) border border-solid [border-color:var(--border-subtle)] border-l-2",
        "[box-shadow:var(--shadow-md)]",
        "transition-[opacity,transform] duration-(--dur-base) ease-(--ease-standard)",
        entered ? "opacity-100" : "opacity-0",
        offAxis,
        TONE_BORDER[record.tone],
      )}
    >
      {TONE_ICON[record.tone]}
      <div className="font-ui [color:var(--text-primary)] text-sm/sm grow">
        {record.message}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 kit-focus-ring [color:var(--text-tertiary)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
