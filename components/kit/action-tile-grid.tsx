// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Action Tile Grid" (6YD-0) — a flex-wrap w-[300px] gap-(--sp-4) of w-[142px] tiles, each
//   p-(--sp-5) rounded-md gap-(--sp-3) border border-solid [border-color:var(--border-subtle)]
//   with a 20×20 icon, a font-(--weight-semibold) [color:var(--text-primary)] title, and a
//   sub-label that is EITHER `text-accent` (a count/badge, e.g. "1 Delivery Pending") OR
//   `[color:var(--text-tertiary)]` (plain sub-label, e.g. "Raw ingredients").
//
// tile pressed (--surface-hover, brief) is the §9 global. tile disabled
// (component-states.md §2 C27) is the §9.7 rule: opacity-[0.5], pointer-events:none.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ActionTile {
  icon: React.ReactNode;
  label: string;
  /** Sub-label. Rendered accent-colored when `badge` is true, else tertiary. */
  subLabel: string;
  badge?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface ActionTileGridProps {
  tiles: ActionTile[];
  className?: string;
}

export function ActionTileGrid({ tiles, className }: ActionTileGridProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-wrap w-[300px] gap-(--sp-4) shrink-0 antialiased",
        className,
      )}
    >
      {tiles.map((tile, i) => (
        <button
          key={i}
          type="button"
          disabled={tile.disabled}
          onClick={tile.onClick}
          className={cn(
            "flex flex-col w-[142px] p-(--sp-5) rounded-md gap-(--sp-3) shrink-0 border border-solid [border-color:var(--border-subtle)] text-left",
            "kit-interactive kit-focus-ring [--kit-hover-bg:var(--surface-hover)]",
          )}
        >
          {tile.icon}
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            {tile.label}
          </div>
          <div
            className={cn(
              "font-ui text-caption/micro",
              tile.badge ? "text-accent" : "[color:var(--text-tertiary)]",
            )}
          >
            {tile.subLabel}
          </div>
        </button>
      ))}
    </div>
  );
}
