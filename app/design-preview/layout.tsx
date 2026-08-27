"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Screens re-exported from Paper via get_jsx, one at a time. This list grows
// as each screen is transcribed and verified against its Paper artboard.
const SCREENS: { slug: string; label: string }[] = [
  { slug: "kit", label: "Component Kit" },
  // F1 — Catalog & Locations
  { slug: "admin-catalog-product-catalog", label: "Admin Catalog — Product Catalog" },
  { slug: "admin-catalog-mobile", label: "Admin Catalog — Mobile" },
  { slug: "product-drawer", label: "Product Drawer — Create / Edit" },
  { slug: "product-delete-dialog", label: "Product Delete Dialog" },
  // F2 — Store & Stock Movements (Financials slice)
  { slug: "admin-financials-full-table", label: "Admin Financials — Full Table" },
  { slug: "admin-financials-payment-drawer-open", label: "Admin Financials — Payment Drawer Open" },
  // F2 — Store & Stock Movements (Admin Stock ledger cluster)
  { slug: "admin-stock-ledger-full-width", label: "Admin Stock — Ledger (Full Width)" },
  { slug: "admin-stock-ledger-sidebar-collapsed", label: "Admin Stock — Ledger (Sidebar Collapsed)" },
  { slug: "admin-stock-ledger-drawer-open", label: "Admin Stock — Ledger (Drawer Open)" },
  { slug: "admin-stock-mobile", label: "Admin Stock — Mobile" },
  { slug: "bulk-opening-stock-grid", label: "Bulk Opening Stock Grid" },
  // F2 — Store & Stock Movements (Store Manager)
  { slug: "store-manager-mobile-hub", label: "Store Manager Mobile Hub" },
  { slug: "store-manager-flows-issues-production", label: "Store Manager Flows — Issues & Production" },
  { slug: "store-manager-flows-transfers-consumption", label: "Store Manager Flows — Transfers & Consumption" },
  { slug: "store-manager-stock-levels", label: "Store Manager — Stock Levels" },
  // F2 — Store & Stock Movements (Canteen)
  { slug: "canteen-mobile-operations-hub", label: "Canteen Mobile Operations Hub" },
  { slug: "canteen-transfer-dispatch", label: "Canteen — Transfer Dispatch" },
  { slug: "canteen-stock-levels", label: "Canteen — Stock Levels" },
  // F3 — Assets
  { slug: "admin-assets-register", label: "Admin Assets Register" },
  { slug: "asset-delete-dialog", label: "Asset Delete Dialog" },
  { slug: "asset-drawer", label: "Asset Drawer — Create / Edit" },
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
