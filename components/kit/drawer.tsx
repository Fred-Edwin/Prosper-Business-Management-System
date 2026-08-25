"use client";

import * as React from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-10">
      <div className="mt-8 flex w-[380px] shrink-0 flex-col rounded-md border border-solid border-border-subtle bg-[var(--surface-panel-tint)]">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-solid border-border-subtle px-8">
          <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="outline-none" aria-label="Close">
            <X className="size-4 text-text-tertiary" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="flex grow flex-col gap-6 overflow-y-auto p-8">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-3 border-t border-solid border-border-subtle p-6">{footer}</div>}
      </div>
    </div>
  );
}
