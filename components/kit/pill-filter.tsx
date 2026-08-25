import * as React from "react";
import { cn } from "@/lib/utils";

export interface PillFilterItem {
  key: string;
  label: string;
}

export function PillFilter({
  items,
  activeKey,
  onChange,
  className,
}: {
  items: PillFilterItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "flex h-8 items-center justify-center rounded-lg px-6 font-ui text-sm/sm outline-none",
              active ? "bg-surface-selected font-medium text-accent" : "font-regular text-text-secondary hover:bg-surface-hover",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
