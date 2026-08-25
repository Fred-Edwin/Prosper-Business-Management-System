import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  label?: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const control = (
    <div className={cn("flex h-9 shrink-0 items-center gap-0.5 rounded-sm bg-surface-subtle p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 items-center justify-center rounded-[2px] px-5 font-ui text-sm/sm outline-none transition-colors",
              active ? "bg-surface-page font-medium text-accent shadow-[0_1px_2px_#00000014]" : "font-regular text-text-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
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
