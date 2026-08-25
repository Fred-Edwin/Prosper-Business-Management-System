import * as React from "react";

export interface SummaryStripItem {
  key: string;
  label: string;
  value: string;
}

export function DenseSummaryStrip({ items }: { items: SummaryStripItem[] }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-8 rounded-md bg-gray-900 px-6">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1 font-ui text-sm/sm">
          <span className="text-white/60">{item.label}:</span>
          <span className="font-medium text-white">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
