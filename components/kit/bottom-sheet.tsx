// Verbatim REST transcription of Paper artboard "Component Kit — Bottom Sheet"
// (6Z4-0): "Sheet — Peek" (6ZB-0) and "Sheet — Open" (6ZJ-0). Layout unchanged.
//
// Session 10 (Deliverable 3c) — the staff-shell overlay, same contract as Drawer:
//   - renders its own .kit-scrim (blur + --opacity-scrim + --z-overlay); portal
//     to body; panel at --z-dialog.
//   - scroll-lock + background-inert + focus-trap + focus-restore + single-overlay
//     guard via internal/overlay.ts. Esc closes; backdrop click closes.
//   - slides up from the bottom via transform + --dur-base (.kit-sheet-panel in
//     globals.css) — --ease-decelerate in, --ease-accelerate out. No layout anim.
//   - raw shadow → --shadow-md. z-40/z-50 → the --z-* scale (via .kit-scrim / the
//     panel class). --surface-panel-tint backdrop → .kit-scrim.
//   - drag-to-dismiss kept (pointer down/up, dy > 48 steps the state down).
//   - the grab handle is now a real <button> (Space/Enter steps down) so it is
//     keyboard-operable, not a bare <div>.
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useActiveOverlay,
  useBackgroundInert,
  useEscToClose,
  useFocusTrap,
  useOverlayTransition,
  useScrollLock,
} from "./internal/overlay";

export type BottomSheetState = "closed" | "peek" | "open";

export interface BottomSheetProps {
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
  /** Header title shown in the "open" state. */
  title?: string;
  /** Content shown in the "peek" state (label row + value in the artboard sample). */
  peekContent?: React.ReactNode;
  /** Full-task content shown in the "open" state, below the header. */
  children?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  state,
  onStateChange,
  title,
  peekContent,
  children,
  className,
}: BottomSheetProps) {
  const open = state !== "closed";
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const dragStartY = React.useRef<number | null>(null);

  const { mounted, phase, endExit } = useOverlayTransition(open);
  const active = mounted && phase !== "closing";

  useActiveOverlay(active);
  useScrollLock(mounted);
  useBackgroundInert(rootRef, mounted);
  useFocusTrap(panelRef, active);
  useEscToClose(active, () => onStateChange("closed"));

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setHost(document.body), []);

  if (!mounted || !host) return null;

  function stepDown() {
    onStateChange(state === "open" ? "peek" : "closed");
  }
  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (dy > 48) stepDown();
  }

  const isPeek = state === "peek";

  return createPortal(
    <div ref={rootRef} className="[font-synthesis:none] antialiased">
      <div
        className="kit-scrim"
        data-state={phase}
        onClick={() => onStateChange("closed")}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? "Details" : undefined}
        tabIndex={-1}
        data-state={phase}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && phase === "closing") endExit();
        }}
        className={cn(
          "kit-sheet-panel fixed left-0 right-0 bottom-0 flex flex-col rounded-tl-[16px] rounded-tr-[16px] bg-(--surface-page) [z-index:var(--z-dialog)] [box-shadow:var(--shadow-md)] outline-none",
          isPeek ? "pt-(--sp-5) pb-(--sp-8) gap-(--sp-4) px-(--sp-6)" : "",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Collapse"
          onClick={stepDown}
          className={cn(
            "w-[36px] h-[4px] self-center rounded-[2px] shrink-0 [background-color:var(--border-strong)] kit-focus-ring",
            !isPeek && "mt-(--sp-4) mb-(--sp-5)",
          )}
        />
        {isPeek ? (
          peekContent
        ) : (
          <>
            {title && (
              <div className="pb-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
                <div
                  id={titleId}
                  className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1"
                >
                  {title}
                </div>
              </div>
            )}
            {children}
          </>
        )}
      </div>
    </div>,
    host,
  );
}
