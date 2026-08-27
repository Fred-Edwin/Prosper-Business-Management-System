import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuantityStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  disabled,
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) => {
    if (min !== undefined && next < min) return min;
    if (max !== undefined && next > max) return max;
    return next;
  };

  const control = (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center rounded-sm border border-solid border-border-strong bg-surface-page",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled || (min !== undefined && value <= min)}
        onClick={() => onChange(clamp(value - step))}
        aria-label="Decrease"
        className="flex h-9 w-8 shrink-0 items-center justify-center outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Minus className="size-3.5 text-text-secondary" strokeWidth={1.5} aria-hidden />
      </button>
      <div className="flex min-w-0 grow items-center justify-center gap-1">
        <span className="font-mono text-sm/sm font-semibold text-text-primary">{value}</span>
        <span className="font-ui text-sm/sm text-text-tertiary">{unit}</span>
      </div>
      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(clamp(value + step))}
        aria-label="Increase"
        className="flex h-9 w-8 shrink-0 items-center justify-center outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="size-3.5 text-text-secondary" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );

  if (!label) return control;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">{label}</span>
      {control}
    </div>
  );
}
