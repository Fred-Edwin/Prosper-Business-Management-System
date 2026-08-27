// Verbatim REST transcription of Paper artboard "Component Kit — Drawers & Dialogs"
// (6OE-0): "Friction Delete Dialog" — Default (retype pending) 6OH-0, Confirmed
// 6PC-0, Retype mismatch 9PE-0. Layout unchanged.
//
// Session 10 (Deliverable 3c):
//   - OPAQUE --surface-raised panel (D2/ADR-41), NOT --surface-panel-tint.
//   - renders its own .kit-scrim; portal to body; --z-dialog panel.
//   - focus-trap + scroll-lock + background-inert + focus-restore + single-overlay
//     guard, all via internal/overlay.ts.
//   - Esc closes; focus moves to the retype field on open (via the trap's
//     "first focusable" — the field is first).
//   - footer buttons → <Button> (variant secondary / destructive), so §9.5/§9.7/
//     §9.10 come from one place. The confirm button is `disabled` until the typed
//     string matches, and shows `loading` while `submitting`.
//   - retype-mismatch: the field is NEUTRAL until the user types a non-matching
//     non-empty string, then danger via .kit-field[data-invalid] + the helper
//     line, wired with aria-invalid + aria-describedby.
//   - ADR-36c props kept: cancelLabel / confirmLabel / title / bodyCopy /
//     showArchiveLink.
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  useActiveOverlay,
  useBackgroundInert,
  useEscToClose,
  useFocusTrap,
  useOverlayTransition,
  useScrollLock,
} from "./internal/overlay";

export interface FrictionDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The exact string the user must retype. */
  recordName: string;
  title?: string;
  bodyCopy?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  showArchiveLink?: boolean;
  onArchive?: () => void;
  /** Delete in flight — confirm button shows a spinner, everything locks. */
  submitting?: boolean;
}

const DEFAULT_BODY =
  "You are about to permanently delete this record. This will erase it and its history from every register and audit log. This cannot be undone.";

export function FrictionDeleteDialog({
  open,
  onClose,
  onConfirm,
  recordName,
  title = "Delete Record",
  bodyCopy = DEFAULT_BODY,
  cancelLabel = "Cancel",
  confirmLabel = "Permanently Delete",
  showArchiveLink = true,
  onArchive,
  submitting = false,
}: FrictionDeleteDialogProps) {
  const [typed, setTyped] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const bodyId = React.useId();
  const fieldId = React.useId();
  const errId = React.useId();

  const { mounted, phase, endExit } = useOverlayTransition(open);
  const active = mounted && phase !== "closing";

  useActiveOverlay(active);
  useScrollLock(mounted);
  useBackgroundInert(rootRef, mounted);
  useFocusTrap(panelRef, active);
  useEscToClose(active, onClose);

  React.useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setHost(document.body), []);

  if (!mounted || !host) return null;

  const matches = typed === recordName;
  const mismatch = typed.length > 0 && !matches;

  return createPortal(
    <div ref={rootRef} className="[font-synthesis:none] antialiased">
      <div className="kit-scrim" data-state={phase} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className="kit-dialog-panel fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[440px] max-w-[calc(100vw-var(--sp-8))] rounded-md bg-(--surface-raised) border border-solid [border-color:var(--border-subtle)] [box-shadow:var(--shadow-dialog)] [z-index:var(--z-dialog)] outline-none"
        data-state={phase}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && phase === "closing") endExit();
        }}
      >
        {/* Dialog Header */}
        <div className="flex items-start p-(--sp-8) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="w-[36px] h-[36px] flex items-center justify-center shrink-0 rounded-full bg-danger-bg">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                fill="none"
                stroke="var(--color-danger)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-[2px]">
            <div
              id={titleId}
              className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1"
            >
              {title}
            </div>
            <div className="font-ui font-(--weight-semibold) text-[10px] [letter-spacing:0.06em] uppercase leading-[12px] text-danger">
              Permanent irreversible action
            </div>
          </div>
        </div>

        {/* Dialog Body */}
        <div className="flex flex-col p-(--sp-8) gap-(--sp-6)">
          <div id={bodyId} className="p-(--sp-5) rounded-sm bg-danger-bg">
            <div className="font-ui text-danger text-sm/sm">{bodyCopy}</div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor={fieldId}
              className="font-ui [color:var(--text-secondary)] text-sm/sm"
            >
              To confirm, type the exact record name below:
            </label>
            <div
              className={cn(
                "flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid kit-field",
                mismatch
                  ? "border-danger"
                  : "[border-color:var(--border-strong)]",
              )}
              data-invalid={mismatch || undefined}
            >
              <input
                id={fieldId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={recordName}
                aria-invalid={mismatch || undefined}
                aria-describedby={mismatch ? errId : undefined}
                autoComplete="off"
                className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm w-full bg-transparent outline-none placeholder:font-(--weight-regular) placeholder:[color:var(--text-tertiary)]"
              />
            </div>
            {mismatch && (
              <div id={errId} className="font-ui text-danger text-caption/micro">
                The name doesn’t match. Type it exactly to enable deletion.
              </div>
            )}
          </div>
          {showArchiveLink && (
            <button
              type="button"
              onClick={onArchive}
              className="flex items-center gap-[6px] kit-focus-ring rounded-sm self-start"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
                <path d="M21 8v13H3V8" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 3h22v5H1z" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="10" y1="12" x2="14" y2="12" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="font-ui font-(--weight-medium) text-accent text-sm/sm">
                Archive instead — hides it without data loss
              </div>
            </button>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end p-(--sp-8) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!matches}
            loading={submitting}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    host,
  );
}
