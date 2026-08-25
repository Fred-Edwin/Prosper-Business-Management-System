import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
}

export function Tabs({
  items,
  activeKey,
  onChange,
  className,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", className)} role="tablist">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex h-9 items-center justify-center border-b-2 border-solid px-5 font-ui text-sm/sm font-medium outline-none disabled:pointer-events-none",
              active ? "border-accent text-accent" : "border-transparent",
              !active && !item.disabled && "text-text-secondary hover:text-text-primary",
              item.disabled && "border-transparent text-text-disabled",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
