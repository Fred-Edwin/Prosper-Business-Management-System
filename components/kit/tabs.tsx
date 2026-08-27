// Verbatim transcription of Paper artboard "Component Kit — Tabs & Filters" (6IW-0):
// "Tab Row" (6J1-0). Session 2 verified state-complete (active / inactive / disabled all
// drawn) and byte-identical to the Product Catalog usage. Row = flex items-center border-b
// [border-bottom-color:var(--border-subtle)]. Each tab: h-[36px] px-(--sp-5) border-b-2
// border-b-solid, with `border-b-accent` (active) or `border-b-[#00000000]` (inactive/
// disabled). Label font-(--weight-medium) text-sm/sm, colored `text-accent` (active),
// `[color:var(--text-secondary)]` (inactive), `[color:var(--text-disabled)]` (disabled).
//
// hover (inactive) and focus-visible ring are the §9 globals.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "[font-synthesis:none] flex items-center border-b border-b-solid [border-bottom-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange?.(tab.key)}
            className={cn(
              "flex items-center justify-center h-[36px] px-(--sp-5) border-b-2 border-b-solid kit-interactive kit-focus-ring",
              isActive ? "border-b-accent" : "border-b-[#00000000]",
            )}
          >
            <span
              className={cn(
                "font-ui font-(--weight-medium) text-sm/sm",
                isActive
                  ? "text-accent"
                  : tab.disabled
                    ? "[color:var(--text-disabled)]"
                    : "[color:var(--text-secondary)]",
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
