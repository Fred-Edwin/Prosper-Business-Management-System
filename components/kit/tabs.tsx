// Verbatim REST transcription of Paper artboard "Component Kit — Tabs & Filters"
// (6IW-0): "Tab Row" (6J1-0). active / inactive / disabled drawn; layout unchanged.
//
// Session 10 rewire:
//   - raw `border-b-[#00000000]` → `border-b-transparent`.
//   - WAI-ARIA APG tabs pattern: roving tabIndex (only the selected tab is
//     tabbable), ArrowLeft/Right + Home/End move + select (selection follows
//     focus), via internal/roving.ts.
//   - `aria-controls` → the panel id (caller supplies `panelId` per tab, or a
//     derived one); the panel it points at must be role="tabpanel"
//     aria-labelledby={tabId}. `id` per tab is derived so screens can wire the
//     panel without threading ids.
//   - hover / focus-visible ring stay the §9 globals (.kit-interactive /
//     .kit-focus-ring).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRovingGroup } from "./internal/roving";

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
  /** id of the tabpanel this tab controls (role="tabpanel" aria-labelledby=tabId). */
  panelId?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  /** Prefix for the derived per-tab id (`${idBase}-tab-${key}`). */
  idBase?: string;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, idBase, className }: TabsProps) {
  const reactId = React.useId();
  const base = idBase ?? `tabs-${reactId}`;
  const { onKeyDown, tabIndexFor } = useRovingGroup({
    items: tabs,
    activeKey,
    onChange,
    orientation: "horizontal",
  });

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
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
            id={`${base}-tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={tab.panelId}
            tabIndex={tabIndexFor(tab.key)}
            disabled={tab.disabled}
            onClick={() => onChange?.(tab.key)}
            className={cn(
              "flex items-center justify-center h-(--control-md) px-(--sp-5) border-b-2 border-b-solid kit-interactive kit-focus-ring [--kit-hover-bg:transparent]",
              isActive ? "border-b-accent" : "border-b-transparent",
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
