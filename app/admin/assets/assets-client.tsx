// Session 13 — M1-F3 Assets Register, COMPOSED from the proven kit.
//
// ADR-44 applies to the artboard (8DL-0): it is a pre-kit Session 3-4
// transcription — bespoke 240px sidenav, bespoke table, a "Category" tab
// filter for a field the schema does not have (Asset = name / location /
// purchaseDate / purchaseCost / condition / deletedAt), an inline
// bg-gray-900 summary strip. Per ADR-44 the proven kit is the visual
// acceptance target and the per-screen visual gate diffs against the kit
// Storybook stories (<PageShell>, <SimpleTable>, <SearchInput>,
// <EmptyState>/<ErrorState>), not the stale artboard. See ADR-45 / PROGRESS.
//
// Structure mirrors app/admin/catalog/catalog-client.tsx: <PageShell> +
// <SearchInput> + <SimpleTable> (desktop) / a card list (< --bp-md) +
// <EmptyState> / <ErrorState> + a rail <Drawer> + <FrictionDeleteDialog>.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Tabs } from "@/components/kit/tabs";
import { SearchInput } from "@/components/kit/search-input";
import {
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/kit/simple-table";
import { ConditionChip } from "@/components/kit/condition-chip";
import { StatusChip } from "@/components/kit/status-chip";
import { ErrorState } from "@/components/kit/error-state";
import { Button } from "@/components/kit/button";
import { useToast } from "@/components/kit/toast";
// Value + types imported from the leaf module, not the domain barrel: the
// barrel re-exports server-only code (prisma), and a "use client" file that
// pulls a *value* from it drags lib/db into the browser bundle. `import type`
// is erased so the other screens are fine importing types from the barrel;
// this one needs the ASSET_CONDITIONS value at runtime.
import type { AssetCondition, AssetView } from "@/lib/domain/assets/types";
import { ASSET_CONDITIONS } from "@/lib/domain/assets/types";
import { useAssets, type AssetsListFilter } from "./use-assets";
import { AssetDrawer } from "./asset-drawer";
import { AssetDeleteDialog } from "./asset-delete-dialog";

/** "45000.00" -> "45,000.00" (grouping only; value already 2dp from the API). */
function groupThousands(value: string): string {
  const [whole, frac] = value.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${frac ? `.${frac}` : ""}`;
}

/** "2025-01-15" -> "Jan 15, 2025" (matches the artboard's display form). */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const CONDITION_FILTERS: { key: string; label: string; value?: AssetCondition }[] = [
  { key: "all", label: "All conditions", value: undefined },
  ...ASSET_CONDITIONS.map((c) => ({ key: c, label: c, value: c })),
];

const ASSET_TABS = [
  { key: "active", label: "All", archived: false },
  { key: "archived", label: "Archived", archived: true },
];

export function AssetsClient() {
  const [search, setSearch] = React.useState("");
  const [conditionKey, setConditionKey] = React.useState("all");
  const [tabKey, setTabKey] = React.useState("active");

  const activeTab = ASSET_TABS.find((t) => t.key === tabKey) ?? ASSET_TABS[0];
  const activeConditionFilter =
    CONDITION_FILTERS.find((c) => c.key === conditionKey) ?? CONDITION_FILTERS[0];

  const filter: AssetsListFilter = {
    search,
    condition: activeConditionFilter.value,
    includeDeleted: activeTab.archived,
  };

  const {
    assets,
    locations,
    loading,
    error,
    refresh,
    create,
    update,
    softDelete,
    restore,
    hardDelete,
  } = useAssets(filter);
  const { toast } = useToast();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AssetView | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AssetView | null>(null);

  // On the Archived tab, listAssets(includeDeleted:true) returns both active
  // and archived rows — show only the archived ones there.
  const visibleAssets = activeTab.archived
    ? assets.filter((a) => a.deletedAt != null)
    : assets;

  function openCreate() {
    setSelected(null);
    setDrawerOpen(true);
  }
  function openEdit(asset: AssetView) {
    setSelected(asset);
    setDrawerOpen(true);
  }

  async function handleRestore(asset: AssetView) {
    try {
      await restore(asset.id);
      toast("Asset restored", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not restore the asset.", {
        tone: "danger",
      });
    }
  }

  const count = `${visibleAssets.length} asset${
    visibleAssets.length === 1 ? "" : "s"
  }`;
  const filtered = search.trim() !== "" || activeConditionFilter.value != null;

  function clearFilters() {
    setSearch("");
    setConditionKey("all");
  }

  const columns: SimpleTableColumn<AssetView>[] = [
    {
      key: "name",
      header: "Asset Name",
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
      key: "location",
      header: "Location",
      width: "w-[150px]",
      render: (r) => r.locationName,
    },
    {
      key: "purchaseDate",
      header: "Purchase Date",
      width: "w-[130px]",
      cell: "mono",
      render: (r) => displayDate(r.purchaseDate),
    },
    {
      key: "cost",
      header: "Cost Basis (KES)",
      width: "w-[130px]",
      align: "right",
      cell: "mono",
      render: (r) => groupThousands(r.purchaseCost),
    },
    {
      key: "condition",
      header: "Condition",
      width: "w-[130px]",
      render: (r) => <ConditionChip condition={r.condition} />,
    },
    {
      key: "edit",
      header: activeTab.archived ? "Action" : "Edit",
      width: "w-[110px]",
      render: (r) =>
        activeTab.archived ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleRestore(r);
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
            Physical Assets Register
          </div>
          <div className="flex items-center h-[22px] px-(--sp-4) rounded-lg [background-color:var(--surface-hover)]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
              {count}
            </div>
          </div>
          <div className="grow" />
          <Button variant="primary" onClick={openCreate}>
            Register New Asset
          </Button>
        </>
      }
    >
      <div className="flex flex-col grow gap-(--sp-8)">
        {/* Active / Archived tab (A5 / ADR-47 §1) */}
        <Tabs
          tabs={ASSET_TABS.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={tabKey}
          onChange={setTabKey}
        />

        {/* Filters */}
        <div className="flex items-center justify-between gap-(--sp-4)">
          <div
            role="radiogroup"
            aria-label="Filter by condition"
            className="flex items-center gap-(--sp-3)"
          >
            {CONDITION_FILTERS.map((c) => {
              const active = c.key === conditionKey;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setConditionKey(c.key)}
                  className={`font-ui font-(--weight-medium) h-(--control-sm) px-(--sp-5) rounded-sm text-sm/micro kit-focus-ring ${
                    active
                      ? "bg-accent text-white"
                      : "[background-color:var(--surface-hover)] [color:var(--text-secondary)]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search assets…"
            aria-label="Search assets"
          />
        </div>

        {error ? (
          <ErrorState
            title="Couldn't load the asset register"
            description={error}
            onRetry={refresh}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <SimpleTable
                columns={columns}
                rows={visibleAssets}
                rowKey={(r) => r.id}
                loading={loading && visibleAssets.length === 0}
                emptyState={{
                  variant: filtered ? "filtered" : "default",
                  title: filtered
                    ? "No assets match these filters"
                    : "No assets registered yet",
                  description: filtered
                    ? "Try a different search term or condition, or clear the filters."
                    : "Register your first asset to start building the register.",
                  actionLabel: filtered ? "Clear filters" : "Register New Asset",
                  onAction: filtered ? clearFilters : openCreate,
                }}
              />
            </div>

            {/* Mobile card list */}
            <div className="flex md:hidden flex-col [width:100%]">
              {loading && visibleAssets.length === 0 ? (
                <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
                  Loading…
                </div>
              ) : visibleAssets.length === 0 ? (
                <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
                  {filtered
                    ? "No assets match these filters."
                    : "No assets registered yet."}
                </div>
              ) : (
                visibleAssets.map((card) => (
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
                          <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                            {card.locationName}
                          </div>
                          <ConditionChip condition={card.condition} />
                          {card.deletedAt && (
                            <StatusChip variant="neutral">Archived</StatusChip>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-(--sp-3)">
                        {activeTab.archived ? (
                          <button
                            type="button"
                            onClick={() => void handleRestore(card)}
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
                      <div className="flex flex-col grow p-(--sp-4) gap-[2px]">
                        <div className="font-ui text-micro uppercase leading-[14px] [color:var(--text-tertiary)]">
                          Purchased
                        </div>
                        <div className="font-mono font-(--weight-medium) w-max text-sm/micro [color:var(--text-primary)]">
                          {displayDate(card.purchaseDate)}
                        </div>
                      </div>
                      <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
                      <div className="flex flex-col grow p-(--sp-4) gap-[2px]">
                        <div className="font-ui text-micro uppercase leading-[14px] [color:var(--text-tertiary)]">
                          Cost Basis (KES)
                        </div>
                        <div className="font-mono font-(--weight-medium) w-max text-sm/micro [color:var(--text-primary)]">
                          {groupThousands(card.purchaseCost)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Overlays — the kit components own their own scrim / portal / focus-trap. */}
      <AssetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        asset={selected}
        onCreate={create}
        onUpdate={update}
        onRequestDelete={selected ? () => setDeleteTarget(selected) : undefined}
      />
      <AssetDeleteDialog
        open={deleteTarget !== null}
        asset={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onHardDelete={async (id, confirmName) => {
          await hardDelete(id, confirmName);
          setDrawerOpen(false);
        }}
        onSoftDelete={async (id) => {
          await softDelete(id);
          setDrawerOpen(false);
        }}
      />
    </PageShell>
  );
}
