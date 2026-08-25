"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  displayValue: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ label, value, onChange, displayValue, disabled, className }: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const field = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.showPicker?.()}
      className={cn(
        "relative flex h-9 shrink-0 items-center justify-between rounded-sm border border-solid border-border-strong bg-surface-page px-3 outline-none focus-visible:border-[1.5px] focus-visible:border-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="font-mono text-sm/sm text-text-primary">{displayValue}</span>
      <Calendar className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={1.5} aria-hidden />
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </button>
  );

  if (!label) return field;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">{label}</span>
      {field}
    </div>
  );
}
