import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionTile {
  key: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  onClick?: () => void;
}

export function ActionTileGrid({ tiles, className }: { tiles: ActionTile[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onClick}
            className="flex flex-[1_0_calc(50%-6px)] flex-col gap-1.5 rounded-md border border-solid border-border-subtle p-3 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <span className="font-ui text-sm/sm font-semibold text-text-primary">{tile.label}</span>
            <span className="font-ui text-caption/caption text-accent">{tile.meta}</span>
          </button>
        );
      })}
    </div>
  );
}
