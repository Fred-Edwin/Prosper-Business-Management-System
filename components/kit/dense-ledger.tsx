import * as React from "react";
import { cn } from "@/lib/utils";

export interface LedgerRow {
  id: string;
  location?: string;
  product: string;
  opening: number;
  purchases: number | null;
  issues: number | null;
  production: number | null;
  transferIn: number | null;
  transferOut: number | null;
  sold: number | null;
  soldValue: number | null;
  closing: number;
  closingValue: number;
  corrected?: boolean;
}

function fmt(value: number | null, signed: boolean): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value).toLocaleString("en-KE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (!signed) return abs;
  return value > 0 ? `+${abs}` : value < 0 ? `-${abs}` : abs;
}

function fmtMoney(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MOVEMENT_COLS: { key: keyof LedgerRow; header: string; width: number; signed: boolean }[] = [
  { key: "opening", header: "Opening", width: 90, signed: false },
  { key: "purchases", header: "Purchases (+)", width: 100, signed: true },
  { key: "issues", header: "Issues (-)", width: 90, signed: true },
  { key: "production", header: "Production (+)", width: 100, signed: true },
  { key: "transferIn", header: "Transfer In (+)", width: 110, signed: true },
  { key: "transferOut", header: "Transfer Out (-)", width: 120, signed: true },
  { key: "sold", header: "Sold (-)", width: 80, signed: true },
];

export function DenseLedger({
  rows,
  showLocation,
  onEdit,
  className,
}: {
  rows: LedgerRow[];
  showLocation?: boolean;
  onEdit?: (row: LedgerRow) => void;
  className?: string;
}) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.opening += r.opening;
      acc.purchases += r.purchases ?? 0;
      acc.issues += r.issues ?? 0;
      acc.production += r.production ?? 0;
      acc.transferIn += r.transferIn ?? 0;
      acc.transferOut += r.transferOut ?? 0;
      acc.sold += r.sold ?? 0;
      acc.soldValue += r.soldValue ?? 0;
      acc.closing += r.closing;
      acc.closingValue += r.closingValue;
      return acc;
    },
    { opening: 0, purchases: 0, issues: 0, production: 0, transferIn: 0, transferOut: 0, sold: 0, soldValue: 0, closing: 0, closingValue: 0 },
  );

  return (
    <div className={cn("w-full overflow-auto rounded-none border border-solid border-border-subtle", className)}>
      <div className="min-w-max">
        <div className="flex h-8 items-center gap-3 border-b border-solid border-gray-600 bg-info-bg pl-6">
          {showLocation && <span className="w-[140px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Location</span>}
          <span className="min-w-[140px] grow border-r border-solid border-border-subtle pr-3 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Product</span>
          {MOVEMENT_COLS.map((c) => (
            <span key={c.key} style={{ width: c.width }} className="shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
              {c.header}
            </span>
          ))}
          <span className="w-[100px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Sold Value</span>
          <span className="w-[90px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Closing</span>
          <span className="w-[110px] shrink-0 pr-6 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Closing Value</span>
          {onEdit && <span className="w-[50px] shrink-0 pr-6 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Edit</span>}
        </div>

        {rows.map((row) => (
          <div key={row.id} className="flex h-[38px] items-center gap-3 border-b border-solid border-border-subtle pl-6 last:border-b-0">
            {showLocation && <span className="w-[140px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.location}</span>}
            <span className="flex min-w-[140px] grow items-center gap-1.5 border-r border-solid border-border-subtle pr-3 font-ui text-sm/sm font-medium text-text-primary">
              {row.product}
              {row.corrected && (
                <span className="rounded-sm bg-warning-bg px-1.5 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-warning">
                  Corrected
                </span>
              )}
            </span>
            {MOVEMENT_COLS.map((c) => {
              const value = row[c.key] as number | null;
              return (
                <span
                  key={c.key}
                  style={{ width: c.width }}
                  className={cn(
                    "shrink-0 text-right font-mono text-sm/sm",
                    c.signed && value !== null && value > 0 && "text-success",
                    c.signed && value !== null && value < 0 && "text-danger",
                    (!c.signed || value === null) && "text-text-primary",
                  )}
                >
                  {fmt(value, c.signed)}
                </span>
              );
            })}
            <span className="w-[100px] shrink-0 text-right font-mono text-sm/sm text-text-primary">{fmtMoney(row.soldValue)}</span>
            <span className="w-[90px] shrink-0 text-right font-mono text-sm/sm font-semibold text-text-primary">{fmt(row.closing, false)}</span>
            <span className="w-[110px] shrink-0 pr-6 text-right font-mono text-sm/sm font-semibold text-text-primary">{fmtMoney(row.closingValue)}</span>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="w-[50px] shrink-0 pr-6 text-left font-ui text-sm/sm font-medium text-accent outline-none hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        ))}

        <div className="flex h-9 items-center gap-3 bg-gray-900 pl-6">
          {showLocation && <span className="w-[140px] shrink-0" />}
          <span className="min-w-[140px] grow border-r border-solid border-white/10 pr-3 font-ui text-sm/sm font-semibold text-white">
            Totals (reconciled)
          </span>
          {MOVEMENT_COLS.map((c) => (
            <span key={c.key} style={{ width: c.width }} className="shrink-0 text-right font-mono text-sm/sm font-semibold text-white">
              {fmt(totals[c.key as keyof typeof totals] as number, c.signed)}
            </span>
          ))}
          <span className="w-[100px] shrink-0 text-right font-mono text-sm/sm font-semibold text-white">{fmtMoney(totals.soldValue)}</span>
          <span className="w-[90px] shrink-0 text-right font-mono text-sm/sm font-semibold text-white">{fmt(totals.closing, false)}</span>
          <span className="w-[110px] shrink-0 pr-6 text-right font-mono text-sm/sm font-semibold text-white">{fmtMoney(totals.closingValue)}</span>
          {onEdit && <span className="w-[50px] shrink-0 pr-6" />}
        </div>
      </div>
    </div>
  );
}
