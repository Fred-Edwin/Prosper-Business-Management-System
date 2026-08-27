// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Breadcrumb" (6XV-0). Session 2 verified this state-complete — parent link
// [color:var(--text-tertiary)] text-sm/sm, "/" separator [color:var(--text-disabled)]
// text-sm/micro, current font-(--weight-medium) [color:var(--text-primary)] text-sm/sm.
// link hover (underline, --text-primary) is the §9 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "[font-synthesis:none] flex items-center gap-(--sp-3) antialiased",
        className,
      )}
    >
      {items.map((item, i) => {
        const isCurrent = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="font-ui [color:var(--text-disabled)] text-sm/micro">/</span>
            )}
            {isCurrent ? (
              <span
                aria-current="page"
                className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm"
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                onClick={item.onClick}
                className="font-ui [color:var(--text-tertiary)] text-sm/sm kit-focus-ring hover:underline hover:[color:var(--text-primary)]"
              >
                {item.label}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
