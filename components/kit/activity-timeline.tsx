// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Activity Timeline" (6YS-0) — a flex-col w-[340px] of rows, each py-(--sp-5) gap-[2px]
// with a border-b [border-bottom-color:var(--border-subtle)] hairline (last row omits it,
// per the get_jsx). Row = title font-(--weight-medium) [color:var(--text-primary)] +
// a right-aligned signed value font-mono font-(--weight-semibold) that is `text-danger`
// (negative) or `text-success` (positive), then a tertiary subtitle line.
//
// empty (component-states.md §2 C28 — "No movements logged today") ties to EmptyState; no
// dedicated empty frame was found on 6WD-0, so it renders here as a single tertiary line.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ActivityTimelineRow {
  title: string;
  subtitle: string;
  /** The signed value string, e.g. "-18.5 kg" / "+40.0 pcs". */
  value: string;
  /** Sign drives the color: "negative" → text-danger, "positive" → text-success. */
  sign: "positive" | "negative";
}

export interface ActivityTimelineProps {
  rows: ActivityTimelineRow[];
  emptyMessage?: string;
  className?: string;
}

export function ActivityTimeline({
  rows,
  emptyMessage = "No movements logged today",
  className,
}: ActivityTimelineProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col w-[340px] shrink-0 antialiased",
        className,
      )}
    >
      {rows.length === 0 ? (
        <div
          role="status"
          className="py-(--sp-5) font-ui [color:var(--text-tertiary)] text-caption/micro"
        >
          {emptyMessage}
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col py-(--sp-5) gap-[2px]",
              i < rows.length - 1 &&
                "border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                {row.title}
              </div>
              <div
                className={cn(
                  "font-mono font-(--weight-semibold) text-sm/micro",
                  row.sign === "negative" ? "text-danger" : "text-success",
                )}
              >
                {row.value}
              </div>
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {row.subtitle}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
