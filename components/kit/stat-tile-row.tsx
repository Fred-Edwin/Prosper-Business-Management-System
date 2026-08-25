import * as React from "react";

export interface StatTile {
  key: string;
  label: string;
  value: string;
}

export function StatTileRow({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="flex items-stretch">
      {tiles.map((tile, index) => (
        <React.Fragment key={tile.key}>
          <div className="flex flex-col gap-1.5 pr-8">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-tertiary">{tile.label}</span>
            <span className="font-mono text-display/display font-semibold text-text-primary">{tile.value}</span>
          </div>
          {index < tiles.length - 1 && <div className="w-px shrink-0 self-stretch bg-gray-500" />}
        </React.Fragment>
      ))}
    </div>
  );
}
