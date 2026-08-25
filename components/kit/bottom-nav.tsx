import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export function BottomNav({
  items,
  activeKey,
  onNavigate,
  className,
}: {
  items: BottomNavItem[];
  activeKey: string;
  onNavigate: (href: string) => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex h-14 w-full shrink-0 items-center border-t border-solid border-border-subtle bg-surface-page", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.href)}
            className={cn("flex h-full flex-1 flex-col items-center justify-center gap-0.5", active ? "text-accent" : "text-text-tertiary")}
          >
            <Icon className="size-5" strokeWidth={1.5} aria-hidden />
            <span className="font-ui text-micro/[14px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
