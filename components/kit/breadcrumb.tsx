import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={cn("flex items-center gap-2 font-ui text-sm/sm", className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            {index > 0 && <span className="text-text-disabled">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-text-tertiary hover:text-text-primary">
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast ? "font-medium text-text-primary" : "text-text-tertiary")}>{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
