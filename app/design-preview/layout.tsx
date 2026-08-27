"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Screens re-exported from Paper via get_jsx, one at a time. This list grows
// as each screen is transcribed and verified against its Paper artboard.
const SCREENS: { slug: string; label: string }[] = [
  { slug: "admin-catalog-product-catalog", label: "Admin Catalog — Product Catalog" },
];

const COLLAPSE_STORAGE_KEY = "design-preview-nav-collapsed";

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="flex min-h-screen w-full">
      {collapsed ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="fixed top-4 left-4 z-50 flex size-8 items-center justify-center rounded-sm border border-solid border-border-subtle bg-surface-page text-text-secondary shadow-sm outline-none hover:bg-surface-hover"
          aria-label="Show screen list"
        >
          <PanelLeftOpen className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      ) : (
        <nav className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-solid border-border-subtle bg-surface-subtle p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-ui text-caption/caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              Design Preview ({SCREENS.length})
            </span>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex size-6 shrink-0 items-center justify-center rounded-sm text-text-tertiary outline-none hover:bg-surface-hover"
              aria-label="Hide screen list"
            >
              <PanelLeftClose className="size-3.5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          {SCREENS.map((s) => (
            <Link
              key={s.slug}
              href={`/design-preview/${s.slug}`}
              className="rounded-sm px-2 py-1.5 font-ui text-sm/sm text-text-primary hover:bg-surface-hover"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="min-w-0 grow overflow-auto">{children}</div>
    </div>
  );
}
