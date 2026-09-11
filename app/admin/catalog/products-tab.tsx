// The Products tab body for /admin/catalog. Split out of catalog-client.tsx
// (Session 9C) when the Locations tab landed alongside it — the data path,
// the 4 kind sub-tabs + Archived, search / location filters, the desktop
// table / mobile card list and the drawer + delete-dialog orchestration are
// all VERBATIM from the previous single-file version.
//
// The screen header lives in catalog-client.tsx now; this tab publishes its
// row count and its "Add Product" trigger up through `onState` so the shared
// header can render the badge + button (same pattern as financials /
// staff — the header action reaches into the active tab).
"use client";

import * as React from "react";
import { Tabs } from "@/components/kit/tabs";
import { SearchInput } from "@/components/kit/search-input";
import {
  SimpleTable,
  type SimpleTableColumn,
  type StickyLeftColumn,
} from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { usedCategoryNames } from "@/lib/catalog-categories";
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

// The product's *kind* (ingredient / dish / goods) — a fixed enum, always
// set. Shown in the "Kind" column. NOT the same as `Product.category` (the
// free-text menu grouping — "Drinks", "Mains", … — shown in its own
// "Category" column, blank when unassigned).
const KIND_LABEL: Record<string, string> = {
  ingredient: "Ingredient",
  dish: "Dish",
  goods: "Goods",
};
const KIND_TONE: Record<string, string> = {
  ingredient: "text-info",
  dish: "text-warning",
  goods: "text-success",
};

function fmt(value: string | null): string {
  return value == null ? "—" : value;
}

// "All locations" sentinel for the location filter <Select>.
const ALL_LOCATIONS = "__all__";

// Pinned during horizontal scroll (client feedback 2026-09-11) — px widths
// must match the "row" and "name" columns' fixed w-[…] classes below.
const ROW_STICKY_COLUMNS: StickyLeftColumn[] = [
  { key: "row", stickyPx: 24 },
  { key: "name", stickyPx: 180 },
];

/** The location names a product is actively assigned to, sorted. */
function assignedLocationNames(product: ProductWithLocations): string[] {
  return product.locations
    .filter((l) => l.active)
    .map((l) => l.locationName)
    .sort((a, b) => a.localeCompare(b));
}

function LocationChips({ product }: { product: ProductWithLocations }) {
  const names = assignedLocationNames(product);
  if (names.length === 0) {
    return <span className="[color:var(--text-tertiary)]">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-[4px]">
      {names.map((name) => (
        <StatusChip key={name} variant="neutral">
          {name}
        </StatusChip>
      ))}
    </span>
  );
}

/** Selling price for a named location type, "—" when not sold there. */
function priceAt(
  product: ProductWithLocations,
  type: "restaurant" | "canteen",
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

/** "12.5000" -> "12.5"; trailing zeros trimmed, "—" when absent. */
function fmtStockQty(value: string | undefined): string {
  if (value == null) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(4).replace(/\.?0+$/, "") || "0";
}

export type ProductsTabState = {
  /** Text for the header count badge (e.g. "12 products" / "3 archived"). */
  countLabel: string;
  /** Opens the create drawer — wired to the header "Add Product" button. */
  openCreate: () => void;
};

export function ProductsTab({
  onState,
}: {
  onState: (state: ProductsTabState) => void;
}) {
  const [activeTabKey, setActiveTabKey] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [locationId, setLocationId] = React.useState<string>(ALL_LOCATIONS);

  const tab = TABS.find((t) => t.key === activeTabKey) ?? TABS[0];
  const filter: CatalogListFilter = {
    kind: tab.kind,
    search,
    includeArchived: tab.archived,
    locationId: locationId === ALL_LOCATIONS ? undefined : locationId,
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

  const openCreate = React.useCallback(() => {
    setSelected(null);
    setDrawerOpen(true);
  }, []);
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

  // Category names already in use — feeds the drawer's autocomplete so a
  // new item's category stays consistent with the pickers (client
  // feedback 2026-09-10). Sourced from the currently loaded set; a
  // convenience, never a constraint (the field is still free-text).
  const categorySuggestions = React.useMemo(
    () => usedCategoryNames(products),
    [products],
  );

  // Kept as just the number (not "N products") — the header badge sits
  // right next to the "Product Catalog" title in a single-row mobile
  // header (ADR-56); a two-word badge wrapped onto its own line and
  // pushed the title to wrap too. "archived" stays since it's a
  // meaningfully different count, not a unit repeating the title.
  const count = tab.archived
    ? `${visibleProducts.length} archived`
    : `${visibleProducts.length}`;
  const filtered = search.trim() !== "" || locationId !== ALL_LOCATIONS;

  // Publish count + create trigger up to the shared header.
  React.useEffect(() => {
    onState({ countLabel: count, openCreate });
  }, [onState, count, openCreate]);

  function clearFilters() {
    setSearch("");
    setLocationId(ALL_LOCATIONS);
  }

  // Row position in the currently filtered/sorted list — "how many rows
  // are there", not a stable id (re-numbers as filters change, matching
  // what the user sees on screen).
  const rowNumber = new Map(visibleProducts.map((p, i) => [p.id, i + 1]));

  const columns: SimpleTableColumn<ProductWithLocations>[] = [
    {
      key: "row",
      header: "#",
      width: "w-[24px]",
      cell: "text",
      render: (r) => rowNumber.get(r.id),
    },
    {
      key: "name",
      header: "Name",
      // Fixed (was "grow min-w-[120px]") — a sticky-left column needs a
      // stable px width so SimpleTable can compute the `left` offset of the
      // columns after it (ROW_STICKY_PX below). Client feedback 2026-09-11:
      // freeze # + Name so the product stays identifiable while scrolling
      // right to the price columns on a narrow screen.
      width: "w-[180px]",
      cell: "strong",
      render: (r) => (
        <span className="flex items-center gap-(--sp-4) min-w-0">
          <span className="truncate">{r.name}</span>
          {r.deletedAt && <StatusChip variant="neutral">Archived</StatusChip>}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      width: "w-[76px]",
      render: (r) => (
        <span className={`font-ui font-(--weight-medium) ${KIND_TONE[r.kind]}`}>
          {KIND_LABEL[r.kind]}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "w-[88px]",
      render: (r) =>
        r.category ? (
          <span className="font-ui [color:var(--text-secondary)]">
            {r.category}
          </span>
        ) : null,
    },
    {
      key: "locations",
      header: "Locations",
      width: "w-[130px]",
      render: (r) => <LocationChips product={r} />,
    },
    { key: "unit", header: "Unit", width: "w-[52px]", cell: "mono", render: (r) => r.unitLabel },
    {
      key: "stock",
      header: "Stock",
      width: "w-[60px]",
      align: "right",
      cell: "mono",
      render: (r) => fmtStockQty(r.stockQty),
    },
    {
      key: "buying",
      header: "Buying",
      width: "w-[80px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={fmt(r.buyingPrice)} />,
    },
    {
      key: "restaurant",
      header: "Restaurant",
      width: "w-[76px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={priceAt(r, "restaurant")} />,
    },
    {
      key: "canteen",
      header: "Canteen",
      width: "w-[76px]",
      align: "right",
      cell: "mono",
      render: (r) => <Money value={priceAt(r, "canteen")} />,
    },
    {
      key: "edit",
      header: tab.archived ? "Action" : "Edit",
      width: "w-[64px]",
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
    <div className="flex flex-col grow gap-(--sp-8)">
      {/* Category tabs — their own row so a narrow viewport never has to
          share width with the search/filter controls below. */}
      <Tabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
      />

      {/* Search + location filter, own row: search leftmost, filter
          rightmost. Wraps to a second line on a narrow viewport instead of
          scrolling — `overflow-x-auto` was tried first (so each control
          keeps its natural width instead of squeezing, or per the earlier
          bug, squeezing the whole page sideways), but per the CSS Overflow
          spec an element can't have `overflow-x: auto` with
          `overflow-y: visible` — the UA silently forces the y-axis to
          `auto` too (verified live, even against an inline
          `!important`-equivalent override), which clips anything a child's
          popover renders below this row's own bottom edge. That's why the
          "Filter by location" dropdown appeared to render *behind* the
          table below it (client feedback 2026-09-11). `flex-wrap` avoids
          the illegal overflow combination entirely: two controls of this
          width essentially never need to scroll on a real device anyway,
          they just stack. Client feedback 2026-09-11/12. */}
      <div className="flex flex-wrap items-center gap-(--sp-4)">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products…"
          aria-label="Search products"
          className="shrink-0 w-[240px] md:w-[280px]"
        />
        <Select
          aria-label="Filter by location"
          options={[
            { value: ALL_LOCATIONS, label: "All locations" },
            ...locations.map((l) => ({ value: l.id, label: l.name })),
          ]}
          value={locationId}
          onChange={setLocationId}
          className="shrink-0"
        />
      </div>

      {error && (
        <div role="alert" className="font-ui text-danger text-sm/sm">
          {error}
        </div>
      )}

      {/* Desktop table. min-w is the summed column widths + row gaps: 1066
          (Store column removed, Name widened from 120 to a fixed 180 for
          sticky-left — client feedback 2026-09-11).

          Both-axis scroll container, bounded height → the sticky header
          pins to ITS top (same proven pattern as DenseLedger's callers,
          e.g. app/admin/stock/stock-client.tsx — "Both-axis scroll
          container, bounded height → the sticky ledger header pins to its
          top", client feedback 2026-09-09). `overflow-x-auto` alone was
          tried first here and doesn't work for a sticky header: per the
          CSS Overflow spec, when one axis is `auto` the OTHER axis cannot
          stay `visible` — the UA silently forces it to `auto` too, even
          past an `!important` inline style (verified live). So a plain
          `overflow-x-auto` wrapper is unavoidably a two-axis scroll
          container already; the fix isn't fighting that, it's giving that
          container a bounded height so it actually has its own scrollport
          for `stickyHeader` to pin against. Without max-h it never
          scrolls internally and `top-0` has nothing to visibly stick to,
          which is the "header just scrolls away" bug (client feedback
          2026-09-11/12). # and Name are pinned during horizontal scroll
          (stickyLeftColumns) so the product stays identifiable while
          scrolling right to the price columns. */}
      <div className="hidden md:block max-h-[70vh] overflow-auto">
        <SimpleTable
          columns={columns}
          rows={visibleProducts}
          rowKey={(r) => r.id}
          stickyHeader
          stickyLeftColumns={ROW_STICKY_COLUMNS}
          className="min-w-[1066px]"
          loading={loading && visibleProducts.length === 0}
          emptyState={{
            variant: filtered ? "filtered" : "default",
            title: filtered ? "No products match these filters" : "No products yet",
            description: filtered
              ? "Try a different search term or location, or clear the filters."
              : "Add your first product to start building the catalog.",
            actionLabel: filtered ? "Clear filters" : "Add Product",
            onAction: filtered ? clearFilters : openCreate,
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
            {filtered
              ? "No products match these filters."
              : "No products yet."}
          </div>
        ) : (
          products.map((card, i) => {
            const prices: { label: string; value: string }[] = [
              { label: "Stock", value: fmtStockQty(card.stockQty) },
              { label: "Buying", value: fmt(card.buyingPrice) },
              { label: "Restaurant", value: priceAt(card, "restaurant") },
              { label: "Canteen", value: priceAt(card, "canteen") },
            ];
            return (
              <div
                key={card.id}
                className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-start justify-between [width:100%]">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="font-ui [color:var(--text-tertiary)] text-sm/micro">
                        {i + 1}.
                      </span>
                      <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
                        {card.name}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-[4px]">
                      <div className={`font-ui text-sm/micro ${KIND_TONE[card.kind]}`}>
                        {KIND_LABEL[card.kind]}
                      </div>
                      {card.category && (
                        <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                          · {card.category}
                        </div>
                      )}
                      <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                        · per {card.unitLabel} ·
                      </div>
                      <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                        {assignedLocationNames(card).length > 0
                          ? assignedLocationNames(card).join(", ")
                          : "No locations"}
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
                <div className="grid grid-cols-3 [width:100%] rounded-sm [background-color:var(--surface-subtle)]">
                  {prices.map((price, i) => {
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    return (
                      <div
                        key={price.label}
                        className={`flex flex-col p-(--sp-4) gap-[2px] min-w-0 ${
                          col !== 0 ? "border-l border-l-solid [border-left-color:var(--border-subtle)]" : ""
                        } ${row !== 0 ? "border-t border-t-solid [border-top-color:var(--border-subtle)]" : ""}`}
                      >
                        <div className="font-ui text-micro uppercase leading-[14px] [color:var(--text-tertiary)]">
                          {price.label}
                        </div>
                        <div
                          className={`font-mono font-(--weight-medium) truncate text-sm/micro ${
                            price.value === "—"
                              ? "[color:var(--text-tertiary)]"
                              : "[color:var(--text-primary)]"
                          }`}
                        >
                          {price.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Overlays — the kit components own their own scrim / portal / focus-trap. */}
      <ProductDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        product={selected}
        categorySuggestions={categorySuggestions}
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
    </div>
  );
}
