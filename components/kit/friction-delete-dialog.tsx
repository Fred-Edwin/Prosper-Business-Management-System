// Verbatim transcription of Paper artboard "Component Kit — Drawers & Dialogs" (6OE-0):
// "Friction Delete Dialog — Default (retype pending)" (6OH-0), "— Confirmed (retyped match)"
// (6PC-0) and "— Retype mismatch" (9PE-0). The three frames are byte-identical except:
//   * confirm button box:
//       pending / mismatch → `bg-gray-200` + label `[color:var(--text-disabled)]`
//       confirmed          → `bg-danger`   + label `text-white`
//   * mismatch adds, directly under the field, a
//       `font-ui text-danger text-caption/micro` line:
//       "The name doesn’t match. Type it exactly to enable deletion."
//
// The retype gate is the only real logic: confirm is enabled iff the typed string ===
// `recordName`. Esc closes; focus moves to the field on open. ADR-36c props:
// cancelLabel / confirmLabel / title / bodyCopy / showArchiveLink (defaults keep the
// generic "Cancel" / "Permanently Delete" + archive link shown).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
}: FrictionDeleteDialogProps) {
  const [typed, setTyped] = React.useState("");
  const fieldRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTyped("");
      // focus the retype field on open
      const t = setTimeout(() => fieldRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const matches = typed === recordName;
  const mismatch = typed.length > 0 && !matches;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="[font-synthesis:none] flex flex-col w-[440px] rounded-md shrink-0 bg-(--surface-panel-tint) border border-solid [border-color:var(--border-subtle)] antialiased"
    >
      {/* Dialog Header */}
      <div className="flex items-start p-(--sp-8) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="w-[36px] h-[36px] flex items-center justify-center shrink-0 rounded-[50%] bg-danger-bg">
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
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
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            {title}
          </div>
          <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.06em] uppercase leading-[12px] text-danger">
            Permanent irreversible action
          </div>
        </div>
      </div>

      {/* Dialog Body */}
      <div className="flex flex-col p-(--sp-8) gap-(--sp-6)">
        <div className="p-(--sp-5) rounded-sm bg-danger-bg">
          <div className="font-ui text-danger text-sm/sm">{bodyCopy}</div>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
            To confirm, type the exact record name below:
          </div>
          <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid border-danger">
            <input
              ref={fieldRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={recordName}
              className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm w-full bg-transparent outline-none placeholder:font-(--weight-regular) placeholder:[color:var(--text-tertiary)]"
            />
          </div>
          {mismatch && (
            <div className="font-ui text-danger text-caption/micro">
              The name doesn’t match. Type it exactly to enable deletion.
            </div>
          )}
        </div>
        {showArchiveLink && (
          <button
            type="button"
            onClick={onArchive}
            className="flex items-center gap-[6px] kit-focus-ring"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
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
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            {cancelLabel}
          </span>
        </button>
        <button
          type="button"
          disabled={!matches}
          onClick={onConfirm}
          className={cn(
            "flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm kit-interactive kit-focus-ring",
            matches ? "bg-danger" : "bg-gray-200",
          )}
        >
          <span
            className={cn(
              "font-ui font-(--weight-medium) text-sm/sm",
              matches ? "text-white" : "[color:var(--text-disabled)]",
            )}
          >
            {confirmLabel}
          </span>
        </button>
      </div>
    </div>
  );
}
