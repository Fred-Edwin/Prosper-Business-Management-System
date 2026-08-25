import * as React from "react";
import { cn } from "@/lib/utils";

export interface BulkEntryLocation {
  key: string;
  label: string;
}

export interface BulkEntryRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantities: Record<string, number>;
  costLabel: string;
  totalValueLabel: string;
}

export interface BulkEntryValuationItem {
  key: string;
  label: string;
  value: string;
  emphasize?: boolean;
}

export function BulkEntryGrid({
  locations,
  rows,
  onQuantityChange,
}: {
  locations: BulkEntryLocation[];
  rows: BulkEntryRow[];
  onQuantityChange: (rowId: string, locationKey: string, value: number) => void;
}) {
  return (
    <div className="flex w-full flex-col rounded-none border border-solid border-border-subtle">
      <div className="flex h-8 shrink-0 items-center gap-5 border-b border-solid border-gray-600 bg-info-bg px-6">
        <span className="min-w-[300px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Item name</span>
        <span className="w-[110px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Category</span>
        <span className="w-[60px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Unit</span>
        {locations.map((loc) => (
          <span key={loc.key} className="w-[110px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
            {loc.label}
          </span>
        ))}
        <span className="w-[120px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Cost / Buying</span>
        <span className="w-[140px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Total Value (KES)</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="flex h-12 shrink-0 items-center gap-5 border-b border-solid border-border-subtle px-6 last:border-b-0">
          <span className="min-w-[300px] grow font-ui text-sm/sm font-medium text-text-primary">{row.name}</span>
          <span className="w-[110px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.category}</span>
          <span className="w-[60px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.unit}</span>
          {locations.map((loc) => (
            <div key={loc.key} className="flex h-8 w-[110px] shrink-0 items-center rounded-sm border border-solid border-accent px-2">
              <input
                type="number"
                value={row.quantities[loc.key] ?? 0}
                onChange={(e) => onQuantityChange(row.id, loc.key, Number(e.target.value))}
                className="min-w-0 grow border-none bg-transparent font-mono text-sm/[16px] font-semibold text-text-primary outline-none"
              />
            </div>
          ))}
          <span className="w-[120px] shrink-0 font-mono text-sm/sm text-text-secondary">{row.costLabel}</span>
          <span className="w-[140px] shrink-0 text-right font-mono text-sm/sm text-text-secondary">{row.totalValueLabel}</span>
        </div>
      ))}
    </div>
  );
}

export function BulkEntryValuationFooter({ items }: { items: BulkEntryValuationItem[] }) {
  return (
    <div className="mt-6 flex h-11 shrink-0 items-center rounded-md bg-gray-900 px-6">
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <div className={cn("flex items-center gap-1.5 pr-8", item.emphasize && "ml-auto pr-0")}>
            <span className="font-ui text-caption/[16px] font-medium uppercase tracking-[0.04em] text-white/60">{item.label}:</span>
            <span className={cn("font-ui text-sm/sm text-white", item.emphasize && "font-semibold")}>{item.value}</span>
          </div>
          {index < items.length - 1 && !items[index + 1]?.emphasize && <div className="mr-8 h-full w-px shrink-0 bg-white/20" />}
        </React.Fragment>
      ))}
    </div>
  );
}
