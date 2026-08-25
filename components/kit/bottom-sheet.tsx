"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  variant?: "peek" | "open";
  className?: string;
}

export function BottomSheet({ open, onOpenChange, children, variant = "open", className }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 rounded-t-2xl bg-surface-page px-6 pb-8 pt-5 shadow-[0_-4px_16px_#00000014] outline-none",
            variant === "open" && "top-6",
            className,
          )}
        >
          <div className="h-1 w-9 shrink-0 self-center rounded-full bg-border-strong" />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const BottomSheetTitle = Dialog.Title;
