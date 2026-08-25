import * as React from "react";
import { cn } from "@/lib/utils";

export interface SimpleTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  mono?: boolean;
  grow?: boolean;
  width?: number;
  render: (row: T) => React.ReactNode;
}

export interface SimpleTableProps<T> {
  columns: SimpleTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onEdit?: (row: T) => void;
  className?: string;
}

export function SimpleTable<T>({ columns, rows, rowKey, onEdit, className }: SimpleTableProps<T>) {
  return (
    <div className={cn("flex w-full flex-col rounded-none border border-solid border-border-subtle", className)}>
      <div className="flex h-8 shrink-0 items-center gap-6 border-b border-solid border-gray-600 bg-info-bg px-6">
        {columns.map((col) => (
          <span
            key={col.key}
            style={col.grow ? { minWidth: 200 } : { width: col.width, flexShrink: 0 }}
            className={cn(
              "font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info",
              col.grow && "grow",
              col.align === "right" && "text-right",
            )}
          >
            {col.header}
          </span>
        ))}
        {onEdit && <span className="w-[50px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Edit</span>}
      </div>
      {rows.map((row) => (
        <div key={rowKey(row)} className="flex h-11 shrink-0 items-center gap-6 border-b border-solid border-border-subtle px-6 last:border-b-0">
          {columns.map((col) => (
            <span
              key={col.key}
              style={col.grow ? { minWidth: 200 } : { width: col.width, flexShrink: 0 }}
              className={cn(
                "font-ui text-sm/sm text-text-secondary",
                col.grow && "grow font-medium text-text-primary",
                col.mono && "font-mono",
                col.align === "right" && "text-right",
              )}
            >
              {col.render(row)}
            </span>
          ))}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="w-[50px] shrink-0 text-left font-ui text-sm/sm font-medium text-accent outline-none hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
