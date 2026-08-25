"use client";

import * as React from "react";
import { AlertTriangle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FrictionDeleteDialogProps {
  open: boolean;
  entityName: string;
  entityLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  onArchiveInstead?: () => void;
}

export function FrictionDeleteDialog({ open, entityName, entityLabel, onCancel, onConfirm, onArchiveInstead }: FrictionDeleteDialogProps) {
  const [retyped, setRetyped] = React.useState("");
  const matched = retyped.trim() === entityName.trim();

  React.useEffect(() => {
    if (!open) setRetyped("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-10">
      <div className="flex w-[440px] shrink-0 flex-col rounded-md border border-solid border-border-subtle bg-[var(--surface-panel-tint)]">
        <div className="flex items-center gap-4 p-6 pb-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-bg">
            <AlertTriangle className="size-[18px] text-danger" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">Delete {entityLabel}</h2>
            <p className="font-ui text-caption/caption text-text-tertiary">Permanent irreversible action</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="rounded-sm bg-danger-bg p-3">
            <p className="font-ui text-sm/sm text-text-secondary">
              You are about to permanently delete this record. This will erase all associated history and cannot be undone.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-ui text-sm/sm text-text-secondary">To confirm, type the exact record name below:</label>
            <div className="flex h-9 items-center rounded-sm border border-solid border-border-strong bg-surface-page px-3 has-[input:focus]:border-[1.5px] has-[input:focus]:border-accent">
              <input
                value={retyped}
                onChange={(e) => setRetyped(e.target.value)}
                placeholder={entityName}
                className="min-w-0 grow border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>
          </div>
          {onArchiveInstead && (
            <button type="button" onClick={onArchiveInstead} className="flex items-center gap-1.5 self-start outline-none">
              <Archive className="size-3.5 text-text-tertiary" strokeWidth={1.5} aria-hidden />
              <span className="font-ui text-sm/sm text-text-secondary underline">Archive instead — hides it without data loss</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-solid border-border-subtle p-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center justify-center rounded-sm border border-solid border-border-strong bg-surface-page px-6 font-ui text-sm/sm font-medium text-text-primary outline-none hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!matched}
            onClick={onConfirm}
            className={cn(
              "flex h-9 items-center justify-center rounded-sm px-6 font-ui text-sm/sm font-medium outline-none disabled:pointer-events-none",
              matched ? "bg-danger text-white hover:opacity-90" : "bg-gray-200 text-text-disabled",
            )}
          >
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}
