// Verbatim transcription of Paper artboard "Component Kit — Bottom Sheet" (6Z4-0):
// "Sheet — Peek" (6ZB-0) and "Sheet — Open" (6ZJ-0). Session 2 verified state-complete.
//
//   peek : flex flex-col pt-(--sp-5) pb-(--sp-8) rounded-tl-[16px] rounded-tr-[16px]
//          gap-(--sp-4) px-(--sp-6) [box-shadow:#00000014_0px_-4px_16px] bg-(--surface-page);
//          a w-[36px] h-[4px] self-center rounded-[2px] [background-color:var(--border-strong)]
//          grab handle, then the peek content (a label row + a big mono value in the sample).
//   open : flex flex-col rounded-tl-[16px] rounded-tr-[16px] bg-(--surface-page);
//          the same grab handle with mt-(--sp-4) mb-(--sp-5); then a header
//          pb-(--sp-5) px-(--sp-6) border-b [border-bottom-color:var(--border-subtle)] with a
//          font-(--weight-semibold) text-h1/h1 title; then the full-task body.
//
// dragging / backdrop are §9 globals (transform only; --surface-panel-tint veil). Minimal
// real behaviour per §B1: peek ⇄ open ⇄ closed via `state`/`onStateChange`, Esc closes,
// backdrop click closes, a downward drag past a threshold steps the state down.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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

function GrabHandle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[36px] h-[4px] self-center rounded-[2px] shrink-0 [background-color:var(--border-strong)]",
        className,
      )}
    />
  );
}

export function BottomSheet({
  state,
  onStateChange,
  title,
  peekContent,
  children,
  className,
}: BottomSheetProps) {
  const dragStartY = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (state === "closed") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onStateChange("closed");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onStateChange]);

  if (state === "closed") return null;

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (dy > 48) {
      onStateChange(state === "open" ? "peek" : "closed");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--surface-panel-tint)"
        onClick={() => onStateChange("closed")}
      />
      {state === "peek" ? (
        <div
          role="dialog"
          aria-modal="true"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className={cn(
            "[font-synthesis:none] fixed left-0 right-0 bottom-0 z-50 flex flex-col pt-(--sp-5) pb-(--sp-8) rounded-tl-[16px] rounded-tr-[16px] gap-(--sp-4) px-(--sp-6) [box-shadow:#00000014_0px_-4px_16px] bg-(--surface-page) antialiased",
            className,
          )}
        >
          <GrabHandle />
          {peekContent}
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className={cn(
            "[font-synthesis:none] fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-tl-[16px] rounded-tr-[16px] bg-(--surface-page) antialiased",
            className,
          )}
        >
          <GrabHandle className="mt-(--sp-4) mb-(--sp-5)" />
          {title && (
            <div className="pb-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
                {title}
              </div>
            </div>
          )}
          {children}
        </div>
      )}
    </>
  );
}
