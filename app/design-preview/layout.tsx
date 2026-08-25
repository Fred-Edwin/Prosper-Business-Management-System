import Link from "next/link";

const SCREENS: { slug: string; label: string }[] = [
  { slug: "admin-catalog-product-catalog", label: "Admin Catalog — Product Catalog" },
  { slug: "admin-catalog-mobile", label: "Admin Catalog — Mobile" },
  { slug: "product-drawer", label: "Product Drawer — Create/Edit" },
  { slug: "product-delete-dialog", label: "Product Delete Dialog" },
  { slug: "admin-stock-ledger-full-width", label: "Admin Stock — Ledger (Full Width)" },
  { slug: "admin-stock-ledger-sidebar-collapsed", label: "Admin Stock — Ledger (Sidebar Collapsed)" },
  { slug: "admin-stock-ledger-drawer-open", label: "Admin Stock — Ledger (Drawer Open)" },
  { slug: "admin-stock-mobile", label: "Admin Stock — Mobile" },
  { slug: "bulk-opening-stock-grid", label: "Bulk Opening Stock Grid" },
  { slug: "admin-financials-full-table", label: "Admin Financials — Full Table" },
  { slug: "admin-financials-payment-drawer-open", label: "Admin Financials — Payment Drawer Open" },
  { slug: "admin-assets-register", label: "Admin Assets Register" },
  { slug: "asset-delete-dialog", label: "Asset Delete Dialog" },
  { slug: "asset-drawer", label: "Asset Drawer — Create/Edit" },
  { slug: "store-manager-mobile-hub", label: "Store Manager Mobile Hub" },
  { slug: "store-manager-flows-issues-production", label: "Store Manager Flows — Issues & Production" },
  { slug: "store-manager-flows-transfers-consumption", label: "Store Manager Flows — Transfers & Consumption" },
  { slug: "store-manager-stock-levels", label: "Store Manager — Stock Levels" },
  { slug: "canteen-mobile-operations-hub", label: "Canteen Mobile Operations Hub" },
  { slug: "canteen-transfer-dispatch", label: "Canteen — Transfer Dispatch" },
  { slug: "canteen-stock-levels", label: "Canteen — Stock Levels" },
];

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <nav className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-solid border-border-subtle bg-surface-subtle p-4">
        <span className="mb-2 font-ui text-caption/caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
          Design Preview ({SCREENS.length} screens)
        </span>
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
      <div className="min-w-0 grow overflow-auto">{children}</div>
    </div>
  );
}
