// Wired from docs/design/screens/admin-catalog-product-catalog/page.tsx
// (Paper artboard 6ZO-0) and .../admin-catalog-mobile/page.tsx (8L7-0).
//
// The skeleton's own 240px sidebar + toolbar are dropped here: app/admin/layout.tsx
// already wraps every admin route in <AdminShell>, which supplies them (see
// session-5 handoff Q — "content-only, same as app/admin/page.tsx"). The
// standalone skeletons keep their sidebars at /design-preview as the visual
// regression fixtures. The CONTENT region (title row, tabs + filters, table /
// mobile cards) is verbatim from the skeleton; this file adds filter state, the
// fetch, and the drawer / delete-dialog orchestration.
"use client";

import * as React from "react";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { useCatalog, type CatalogListFilter } from "./use-catalog";
import { ProductDrawer } from "./product-drawer";
import { ProductDeleteDialog } from "./product-delete-dialog";

const TABS = [
  { label: "All", kind: undefined, archived: false },
  { label: "Ingredients", kind: "ingredient" as const, archived: false },
  { label: "Dishes", kind: "dish" as const, archived: false },
  { label: "Goods", kind: "goods" as const, archived: false },
  { label: "Archived", kind: undefined, archived: true },
];

const CATEGORY_LABEL: Record<string, string> = {
  ingredient: "Ingredient",
  dish: "Dish",
  goods: "Goods",
};
const CATEGORY_TONE: Record<string, string> = {
  ingredient: "text-info",
  dish: "text-warning",
  goods: "text-success",
};

function fmt(value: string | null): string {
  return value == null ? "—" : value;
}

/** Selling price for a named location type, "—" when not sold there. */
function priceAt(
  product: ProductWithLocations,
  type: "restaurant" | "canteen" | "store",
): string {
  const row = product.locations.find(
    (l) => l.locationType === type && l.active,
  );
  return row && row.sellingPrice != null ? row.sellingPrice : "—";
}

export function CatalogClient() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [search, setSearch] = React.useState("");

  const tab = TABS[activeTab];
  const filter: CatalogListFilter = {
    kind: tab.kind,
    search,
    includeArchived: tab.archived,
  };

  const { products, locations, loading, error, create, update, archive, hardDelete } =
    useCatalog(filter);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductWithLocations | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductWithLocations | null>(null);

  function openCreate() {
    setSelected(null);
    setDrawerOpen(true);
  }
  function openEdit(product: ProductWithLocations) {
    setSelected(product);
    setDrawerOpen(true);
  }

  const count = `${products.length} product${products.length === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col grow gap-(--sp-8) px-(--sp-6) py-(--sp-8)">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-(--sp-4)">
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-display/display">
            Product Catalog
          </div>
          <div className="flex items-center h-[22px] px-(--sp-4) rounded-lg [background-color:var(--surface-hover)]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
              {count}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm gap-[6px] bg-accent kit-interactive kit-focus-ring"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="font-ui font-(--weight-medium) text-white text-sm/sm">Add Product</div>
        </button>
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center justify-between border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center">
          {TABS.map((t, i) => {
            const isActive = i === activeTab;
            return (
              <button
                type="button"
                key={t.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center justify-center h-[36px] px-(--sp-5) border-b-2 border-b-solid kit-focus-ring ${
                  isActive ? "border-b-accent" : "border-b-[#00000000]"
                }`}
              >
                <div
                  className={`font-ui font-(--weight-medium) text-sm/sm ${
                    isActive ? "text-accent" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {t.label}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center pb-(--sp-4) gap-(--sp-4)">
          <div className="flex items-center h-[32px] w-[240px] shrink-0 px-(--sp-5) rounded-sm gap-(--sp-3) [background-color:var(--surface-hover)]">
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="font-ui [color:var(--text-primary)] text-sm/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="font-ui text-danger text-sm/sm">{error}</div>
      )}

      {/* Table — desktop */}
      <div className="hidden md:flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
        <div className="flex items-center h-[32px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600">
          <div className="grow min-w-[180px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] text-info">Name</div>
          <div className="w-[100px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase shrink-0 leading-[12px] text-info">Category</div>
          <div className="w-[70px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase shrink-0 leading-[12px] text-info">Unit</div>
          <div className="w-[120px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info">Buying Price</div>
          <div className="w-[110px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info">Restaurant</div>
          <div className="w-[110px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info">Canteen</div>
          <div className="w-[110px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info">Store</div>
          <div className="w-[50px] font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase shrink-0 leading-[12px] text-info">Edit</div>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex items-center h-[44px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">
            Loading…
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center h-[44px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">
            No products match.
          </div>
        ) : (
          products.map((row, i) => {
            const buying = fmt(row.buyingPrice);
            const rest = priceAt(row, "restaurant");
            const cant = priceAt(row, "canteen");
            const store = priceAt(row, "store");
            return (
              <div
                key={row.id}
                className={`flex items-center h-[44px] px-(--sp-6) gap-(--sp-5) shrink-0 ${
                  i < products.length - 1
                    ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                    : ""
                }`}
              >
                <div className="grow min-w-[180px] font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
                  {row.name}
                </div>
                <div className={`w-[100px] font-ui font-(--weight-medium) shrink-0 text-sm/micro ${CATEGORY_TONE[row.kind]}`}>
                  {CATEGORY_LABEL[row.kind]}
                </div>
                <div className="w-[70px] font-mono font-(--weight-regular) shrink-0 [color:var(--text-secondary)] text-sm/micro">
                  {row.unitLabel}
                </div>
                <div className={`w-[120px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap text-sm/micro ${buying === "—" ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}`}>
                  {buying}
                </div>
                <div className={`w-[110px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap text-sm/micro ${rest === "—" ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}`}>
                  {rest}
                </div>
                <div className={`w-[110px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap text-sm/micro ${cant === "—" ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}`}>
                  {cant}
                </div>
                <div className={`w-[110px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap text-sm/micro ${store === "—" ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}`}>
                  {store}
                </div>
                <div className="w-[50px] shrink-0 flex items-center gap-(--sp-3)">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    aria-label={`Delete ${row.name}`}
                    className="font-ui font-(--weight-medium) text-danger text-sm/micro kit-focus-ring"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cards — mobile (same use-catalog data path; markup from admin-catalog-mobile 8L7-0) */}
      <div className="flex md:hidden flex-col [width:100%]">
        {loading && products.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">Loading…</div>
        ) : products.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">No products match.</div>
        ) : (
          products.map((card) => {
            const prices: { label: string; value: string; muted?: boolean }[] = [
              { label: "Buying", value: fmt(card.buyingPrice), muted: card.buyingPrice == null },
              { label: "Restaurant", value: priceAt(card, "restaurant"), muted: priceAt(card, "restaurant") === "—" },
              { label: "Canteen", value: priceAt(card, "canteen"), muted: priceAt(card, "canteen") === "—" },
              { label: "Store", value: priceAt(card, "store"), muted: priceAt(card, "store") === "—" },
            ];
            return (
              <div
                key={card.id}
                className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-start justify-between [width:100%]">
                  <div className="flex flex-col gap-[2px]">
                    <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
                      {card.name}
                    </div>
                    <div className="flex items-center gap-[4px]">
                      <div className={`font-ui text-sm/micro ${CATEGORY_TONE[card.kind]}`}>
                        {CATEGORY_LABEL[card.kind]}
                      </div>
                      <div className="font-ui [color:var(--text-secondary)] text-sm/micro">· per {card.unitLabel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-(--sp-3)">
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(card)}
                      className="font-ui font-(--weight-medium) text-danger text-sm/micro kit-focus-ring"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center [width:100%] rounded-sm [background-color:var(--surface-subtle)]">
                  {prices.map((price, i) => (
                    <React.Fragment key={price.label}>
                      {i > 0 && <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />}
                      <div className="flex flex-col grow p-(--sp-4) gap-[2px]">
                        <div className="font-ui text-micro tracking-[0.03em] uppercase leading-[14px] [color:var(--text-tertiary)]">
                          {price.label}
                        </div>
                        <div
                          className={`font-mono font-(--weight-medium) w-max text-sm/micro ${
                            price.muted ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"
                          }`}
                        >
                          {price.value}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Overlays */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 p-(--sp-8) overflow-y-auto"
          onClick={() => setDrawerOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              locations={locations}
              product={selected}
              onCreate={create}
              onUpdate={update}
            />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-(--sp-8)"
          onClick={() => setDeleteTarget(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductDeleteDialog
              open={deleteTarget !== null}
              product={deleteTarget}
              onClose={() => setDeleteTarget(null)}
              onHardDelete={hardDelete}
              onArchive={archive}
            />
          </div>
        </div>
      )}
    </div>
  );
}
