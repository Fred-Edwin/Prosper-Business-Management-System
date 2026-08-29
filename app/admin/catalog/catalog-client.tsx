// Session 11 rebuild — COMPOSED from the proven kit, no longer a transcription
// of Paper artboards 6ZO-0 (desktop) / 8L7-0 (mobile). Those artboards are the
// visual acceptance target; this screen is assembled from <PageShell> + <Tabs> +
// <SearchInput> + <SimpleTable> (desktop) / a card list (< --bp-md) + the kit
// <Drawer> / <FrictionDeleteDialog> (which now portal + scrim themselves, so the
// old hand-rolled `fixed inset-0 bg-black/30` wrappers are gone).
//
// The data path is unchanged: `useCatalog(filter)`, the 5 tabs (incl. Archived),
// search state, and the drawer / delete-dialog orchestration are verbatim.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Tabs } from "@/components/kit/tabs";
import { SearchInput } from "@/components/kit/search-input";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Button } from "@/components/kit/button";
import { useToast } from "@/components/kit/toast";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { useCatalog, type CatalogListFilter } from "./use-catalog";
import { ProductDrawer } from "./product-drawer";
import { ProductDeleteDialog } from "./product-delete-dialog";

const TABS = [
  { key: "all", label: "All", kind: undefined, archived: false },
  { key: "ingredient", label: "Ingredients", kind: "ingredient" as const, archived: false },
  { key: "dish", label: "Dishes", kind: "dish" as const, archived: false },
  { key: "goods", label: "Goods", kind: "goods" as const, archived: false },
  { key: "archived", label: "Archived", kind: undefined, archived: true },
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

function Money({ value }: { value: string }) {
  const muted = value === "—";
  return (
    <span
      className={muted ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}
    >
      {value}
    </span>
  );
}

export function CatalogClient() {
  const [activeTabKey, setActiveTabKey] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const tab = TABS.find((t) => t.key === activeTabKey) ?? TABS[0];
  const filter: CatalogListFilter = {
    kind: tab.kind,
    search,
    includeArchived: tab.archived,
  };

  const {
    products,
    locations,
    loading,
    error,
    create,
    update,
    archive,
    hardDelete,
    unarchive,
  } = useCatalog(filter);
  const { toast } = useToast();

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

  async function handleUnarchive(product: ProductWithLocations) {
    try {
      await unarchive(product.id);
      toast("Product restored", { tone: "success" });
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not restore the product.",
        { tone: "danger" },
      );
    }
  }

  // `includeArchived=true` returns active + archived rows; on the Archived
  // tab show only the archived ones (ADR-47 §1 — the tab is archived-only,
  // and an unarchived row must leave it).
  const visibleProducts = tab.archived
    ? products.filter((p) => p.deletedAt != null)
    : products;

  const count = `${visibleProducts.length} product${
    visibleProducts.length === 1 ? "" : "s"
  }`;
  const filtered = search.trim() !== "";

  const columns: SimpleTableColumn<ProductWithLocations>[] = [
    {
      key: "name",
      header: "Name",
      width: "grow min-w-[180px]",
      cell: "strong",
      render: (r) => (
        <span className="flex items-center gap-(--sp-4)">
          {r.name}
          {r.deletedAt && <StatusChip variant="neutral">Archived</StatusChip>}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "w-[100px]",
      render: (r) => (
        <span className={`font-ui font-(--weight-medium) ${CATEGORY_TONE[r.kind]}`}>
          {CATEGORY_LABEL[r.kind]}
        </span>
      ),
    },
    { key: "unit", header: "Unit", width: "w-[70px]", cell: "mono", render: (r) => r.unitLabel },
    {
      key: "buying",
      header: "Buying Price",
      width: "w-[120px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={fmt(r.buyingPrice)} />,
    },
    {
      key: "restaurant",
      header: "Restaurant",
      width: "w-[110px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={priceAt(r, "restaurant")} />,
    },
    {
      key: "canteen",
      header: "Canteen",
      width: "w-[110px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={priceAt(r, "canteen")} />,
    },
    {
      key: "store",
      header: "Store",
      width: "w-[110px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={priceAt(r, "store")} />,
    },
    {
      key: "edit",
      header: tab.archived ? "Action" : "Edit",
      width: "w-[110px]",
      render: (r) =>
        tab.archived ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleUnarchive(r);
            }}
            className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
          >
            Unarchive
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
            className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
          >
            Edit
          </button>
        ),
    },
  ];

  return (
    <PageShell
      toolbar={
        <>
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-display/display">
            Product Catalog
          </div>
          <div className="flex items-center h-[22px] px-(--sp-4) rounded-lg [background-color:var(--surface-hover)]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
              {count}
            </div>
          </div>
          <div className="grow" />
          <Button variant="primary" onClick={openCreate}>
            Add Product
          </Button>
        </>
      }
    >
      <div className="flex flex-col grow gap-(--sp-8)">
        {/* Tabs + search */}
        <div className="flex items-center justify-between gap-(--sp-4)">
          <Tabs
            tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products…"
            aria-label="Search products"
          />
        </div>

        {error && (
          <div role="alert" className="font-ui text-danger text-sm/sm">
            {error}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block">
          <SimpleTable
            columns={columns}
            rows={visibleProducts}
            rowKey={(r) => r.id}
            loading={loading && visibleProducts.length === 0}
            emptyState={{
              variant: filtered ? "filtered" : "default",
              title: filtered ? "No products match your search" : "No products yet",
              description: filtered
                ? "Try a different search term, or clear the filter."
                : "Add your first product to start building the catalog.",
              actionLabel: filtered ? "Clear search" : "Add Product",
              onAction: filtered ? () => setSearch("") : openCreate,
            }}
          />
        </div>

        {/* Mobile card list */}
        <div className="flex md:hidden flex-col [width:100%]">
          {loading && visibleProducts.length === 0 ? (
            <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
              Loading…
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
              {filtered ? "No products match your search." : "No products yet."}
            </div>
          ) : (
            products.map((card) => {
              const prices: { label: string; value: string }[] = [
                { label: "Buying", value: fmt(card.buyingPrice) },
                { label: "Restaurant", value: priceAt(card, "restaurant") },
                { label: "Canteen", value: priceAt(card, "canteen") },
                { label: "Store", value: priceAt(card, "store") },
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
                        <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                          · per {card.unitLabel}
                        </div>
                        {card.deletedAt && (
                          <StatusChip variant="neutral">Archived</StatusChip>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-(--sp-3)">
                      {tab.archived ? (
                        <button
                          type="button"
                          onClick={() => void handleUnarchive(card)}
                          className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
                        >
                          Unarchive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit(card)}
                          className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center [width:100%] rounded-sm [background-color:var(--surface-subtle)]">
                    {prices.map((price, i) => (
                      <React.Fragment key={price.label}>
                        {i > 0 && (
                          <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
                        )}
                        <div className="flex flex-col grow p-(--sp-4) gap-[2px]">
                          <div className="font-ui text-micro uppercase leading-[14px] [color:var(--text-tertiary)]">
                            {price.label}
                          </div>
                          <div
                            className={`font-mono font-(--weight-medium) w-max text-sm/micro ${
                              price.value === "—"
                                ? "[color:var(--text-tertiary)]"
                                : "[color:var(--text-primary)]"
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
      </div>

      {/* Overlays — the kit components own their own scrim / portal / focus-trap. */}
      <ProductDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        product={selected}
        onCreate={create}
        onUpdate={update}
        onRequestDelete={
          selected ? () => setDeleteTarget(selected) : undefined
        }
      />
      <ProductDeleteDialog
        open={deleteTarget !== null}
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onHardDelete={async (id, confirmName) => {
          await hardDelete(id, confirmName);
          setDrawerOpen(false); // the product is gone — close the Edit drawer too
        }}
        onArchive={async (id) => {
          await archive(id);
          setDrawerOpen(false);
        }}
      />
    </PageShell>
  );
}
