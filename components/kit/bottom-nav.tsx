// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Bottom Nav" (9J5-0). Session 2 verified state-complete and canonical (§8: item structure
// identical everywhere, border-TOP only). Bar = w-[390px] h-[56px] bg-(--surface-page)
// border-t [border-top-color:var(--border-subtle)]. Each item: flex-col items-center
// justify-center grow h-full gap-[2px], a 20×20 icon and a text-micro font-(--weight-medium)
// leading-[14px] label. Active = icon stroke var(--color-accent) + label `text-accent`;
// inactive = stroke var(--text-tertiary) + label [color:var(--text-tertiary)].
//
// The icon is a slot — callers pass an active/inactive icon pair. item pressed
// (brief --surface-hover) is the §9 global. Focus ring switches to white on this dark-...
// actually a light surface here, so the standard accent ring (.kit-focus-ring) applies.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  key: string;
  label: string;
  /** Rendered when the item is the active one. */
  activeIcon: React.ReactNode;
  /** Rendered when the item is not active. */
  inactiveIcon: React.ReactNode;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  onNavigate?: (key: string) => void;
  className?: string;
}

export function BottomNav({
  items,
  activeKey,
  onNavigate,
  className,
}: BottomNavProps) {
  return (
    <nav
      className={cn(
        "[font-synthesis:none] flex items-center w-[390px] h-[56px] shrink-0 bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)] antialiased text-caption/micro",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate?.(item.key)}
            className="flex flex-col items-center justify-center grow h-full gap-[2px] kit-interactive kit-focus-ring"
          >
            {isActive ? item.activeIcon : item.inactiveIcon}
            <span
              className={cn(
                "font-ui text-micro font-(--weight-medium) inline-block leading-[14px]",
                isActive ? "text-accent" : "[color:var(--text-tertiary)]",
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
