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
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Select } from "@/components/kit/select";
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

// "All locations" sentinel for the location filter <Select>.
const ALL_LOCATIONS = "__all__";

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
    {
      key: "locations",
      header: "Locations",
      width: "w-[220px]",
      render: (r) => <LocationChips product={r} />,
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
    <div className="flex flex-col grow gap-(--sp-8)">
      {/* Category tabs — their own row so a narrow viewport never has to
          share width with the search/filter controls below. */}
      <Tabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
      />

      {/* Search + location filter, own row: search leftmost, filter
          rightmost. Both keep their natural width — the row scrolls
          horizontally on a narrow viewport instead of squeezing either
          control (or, per the earlier bug, the whole page) sideways. */}
      <div className="flex items-center gap-(--sp-4) overflow-x-auto">
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

      {/* Desktop table */}
      <div className="hidden md:block">
        <SimpleTable
          columns={columns}
          rows={visibleProducts}
          rowKey={(r) => r.id}
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
                    <div className="mt-[4px]">
                      <LocationChips product={card} />
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
    </div>
  );
}
