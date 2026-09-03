// Session 11 rebuild — COMPOSED from the kit, no longer a transcription of Paper
// artboard 7UD-0. Assembled from <PageShell> + <Breadcrumb> +
// <InstructionalBanner> + <Tabs> + <BulkEntryGrid> + <Toast> (one per save batch).
//
// The data path is unchanged: the catalog fetch, one editable cell per
// (product, its home location), the per-row dirty state, planOpeningPosts, and
// the submit — one POST /api/stock-movements { movementType: "opening" } per
// dirty row (a re-submit is a correction server-side, ADR-15 / ADR-39) — are
// verbatim.
//
// Phase C2 (2026-09-01): added a `< --bp-md` stacked-card branch (artboards
// LIS-0 / LN4-0, component-states.md §C26 "Mobile composition"). <BulkEntryGrid>
// is desktop-only; below md the same rows/rowState/planOpeningPosts/submit feed a
// card list. No kit change, desktop branch untouched.
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { BulkEntryGrid, type BulkGridRow } from "@/components/kit/bulk-entry-grid";
import { Tabs } from "@/components/kit/tabs";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { useToast } from "@/components/kit/toast";
import { toBusinessDate } from "@/lib/time";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { ProductKind } from "@prisma/client";
import { stockApi, StockRequestError } from "../use-stock";
import { homeLocationType, planOpeningPosts } from "./opening-plan";

const CATEGORY_LABEL: Record<ProductKind, string> = {
  ingredient: "Ingredient",
  dish: "Dish (Finished)",
  goods: "Goods",
};

const TABS = [
  { key: "all", label: "All Items" },
  { key: "ingredient", label: "Kitchen Ingredients" },
  { key: "dish", label: "Dishes" },
  { key: "goods", label: "Goods" },
];

const MAGNITUDE = /^\d+(\.\d+)?$/;

/** Format a KES amount to 2dp with thousands separators. */
function kes(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type RowState = {
  /** the raw text in the editable cell */
  input: string;
  /** last-saved value ("" = never saved this session) */
  saved: string;
  status: "idle" | "saving" | "saved" | "corrected" | "error";
  message?: string;
};

export function OpeningClient() {
  const router = useRouter();
  const { toast } = useToast();
  const businessDate = toBusinessDate(new Date());

  const [products, setProducts] = React.useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [activeTab, setActiveTab] = React.useState("all");
  const [rowState, setRowState] = React.useState<Record<string, RowState>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prods, locs] = await Promise.all([
          stockApi.listProducts(),
          stockApi.listLocations(),
        ]);
        if (cancelled) return;
        setProducts(prods.filter((p) => p.deletedAt == null));
        setLocations(locs);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load the catalog.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = React.useMemo(
    () =>
      activeTab === "all"
        ? products
        : products.filter((p) => p.kind === activeTab),
    [products, activeTab],
  );

  // Home-location display name per product kind ("Store" / "Restaurant" / …),
  // from the first `locations` entry whose type matches homeLocationType(kind).
  const homeLocationLabel = React.useCallback(
    (kind: ProductKind): string => {
      const type = homeLocationType(kind);
      return locations.find((l) => l.type === type)?.name ?? type;
    },
    [locations],
  );

  function setInput(productId: string, value: string) {
    setRowState((s) => ({
      ...s,
      [productId]: {
        input: value,
        saved: s[productId]?.saved ?? "",
        status: "idle",
      },
    }));
  }

  // Per-row derived value, identical between the desktop grid and the mobile
  // card list: live "KES <value>" while the count parses and the product has a
  // buying price, "corrected" / "saved" after a save batch, otherwise "—".
  function rowTotalValue(p: ProductWithLocations, rs: RowState | undefined) {
    const cellVal = rs?.input ?? "";
    return p.buyingPrice && cellVal && MAGNITUDE.test(cellVal.trim())
      ? kes(Number(p.buyingPrice) * Number(cellVal))
      : rs?.status === "saved" || rs?.status === "corrected"
        ? rs.status === "corrected"
          ? "corrected"
          : "saved"
        : "—";
  }

  const rows: BulkGridRow[] = visibleProducts.map((p) => {
    const homeType = homeLocationType(p.kind);
    const rs = rowState[p.id];
    const cellVal = rs?.input ?? "";
    const editableCell = {
      value: cellVal,
      editable: true,
      error: rs?.status === "error",
      onChange: (v: string) => setInput(p.id, v),
    };
    const blankCell = { value: "0.0" };

    return {
      id: p.id,
      item: p.name,
      category: CATEGORY_LABEL[p.kind],
      categoryTone: p.kind === "ingredient" ? "info" : "warning",
      unit: p.unitLabel,
      store: homeType === "store" ? editableCell : blankCell,
      restaurant: homeType === "restaurant" ? editableCell : blankCell,
      canteen: homeType === "canteen" ? editableCell : blankCell,
      costBuying:
        p.kind === "dish" ? "0.00 (Dish)" : (p.buyingPrice ?? "0.00"),
      totalValue: rowTotalValue(p, rs),
    };
  });

  const plannedPosts = React.useMemo(
    () => planOpeningPosts(rowState, products, locations, businessDate),
    [rowState, products, locations, businessDate],
  );

  // Consolidated Day 1 valuation — a whole-baseline total across ALL products
  // (not just the active tab), matching how the desktop grid scopes its
  // valuation footer. Raw stock = Σ (buyingPrice × count) for non-dish rows;
  // dish count = number of dish rows with a count entered or saved.
  const valuation = React.useMemo(() => {
    let rawStock = 0;
    let dishCount = 0;
    let anyDirty = false;
    for (const p of products) {
      const rs = rowState[p.id];
      const raw = (rs?.input ?? "").trim();
      const val = MAGNITUDE.test(raw) ? Number(raw) : null;
      if (val == null) continue;
      anyDirty = true;
      if (p.kind === "dish") {
        dishCount += val;
      } else if (p.buyingPrice) {
        rawStock += Number(p.buyingPrice) * val;
      }
    }
    return { rawStock, dishCount, consolidated: rawStock, anyDirty };
  }, [products, rowState]);

  async function submit() {
    if (plannedPosts.length === 0 || submitting) return;
    setSubmitting(true);

    // Mark them saving.
    setRowState((s) => {
      const next = { ...s };
      for (const p of plannedPosts) {
        next[p.productId] = { ...next[p.productId], status: "saving" };
      }
      return next;
    });

    // One POST per dirty row (ADR-15: a re-submit for the same
    // product/location/date is a correction server-side).
    const results = await Promise.allSettled(
      plannedPosts.map((p) =>
        stockApi.setOpeningStock({
          productId: p.productId,
          locationId: p.locationId,
          businessDate: p.businessDate,
          quantity: p.quantity,
        }),
      ),
    );

    setRowState((s) => {
      const next = { ...s };
      results.forEach((r, i) => {
        const post = plannedPosts[i];
        if (r.status === "fulfilled") {
          next[post.productId] = {
            input: post.quantity,
            saved: post.quantity,
            status: post.isResubmit ? "corrected" : "saved",
          };
        } else {
          const err = r.reason;
          next[post.productId] = {
            ...next[post.productId],
            status: "error",
            message:
              err instanceof StockRequestError ? err.message : "Save failed.",
          };
        }
      });
      return next;
    });

    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = results.length - failed;
    setSubmitting(false);
    if (failed === 0) {
      toast(
        `Saved ${ok} opening ${ok === 1 ? "count" : "counts"} for ${businessDate}.`,
        { tone: "success" },
      );
    } else {
      toast(
        `${ok} saved, ${failed} failed — see the highlighted rows.`,
        { tone: "danger" },
      );
    }
  }

  const pendingCount = plannedPosts.length;
  const saveLabel =
    pendingCount > 0
      ? `Save ${pendingCount} Opening ${pendingCount === 1 ? "Count" : "Counts"}`
      : "Save Baseline & Initialize Day 1";

  return (
    <PageShell wide>
      <AdminPageHeader
        title={
          <Breadcrumb
            items={[
              { label: "Stock & Reconciliation", href: "/admin/stock" },
              { label: `Day 1 Opening Stock — ${businessDate}` },
            ]}
          />
        }
        actions={
          // Desktop-only; on mobile these live in the sticky bottom bar (§3.6).
          <div className="hidden md:flex items-center shrink-0 gap-(--sp-4)">
            <Button
              variant="secondary"
              onClick={() => router.push("/admin/stock")}
            >
              Discard &amp; Back
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={pendingCount === 0 || submitting}
              loading={submitting}
            >
              {saveLabel}
            </Button>
          </div>
        }
      />
      {/* ───────── Desktop grid (≥ --bp-md) ───────── */}
      <div className="hidden md:flex flex-col grow gap-(--sp-8)">
        <InstructionalBanner
          step={1}
          title="Day 1 Opening Stock Count"
          body={
            <span className="flex items-center justify-between gap-(--sp-5)">
              <span>
                Enter the physical count for each item at its home location. A
                re-entered count is saved as a correction of the first.
              </span>
              <span className="font-ui font-(--weight-medium) shrink-0 w-max [color:var(--text-secondary)] text-sm/sm">
                {visibleProducts.length} Items
              </span>
            </span>
          }
        />

        {loadError && (
          <div role="alert" className="font-ui text-danger text-body/sm">
            {loadError}
          </div>
        )}

        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

        {loading ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm">
            Loading…
          </div>
        ) : (
          <BulkEntryGrid rows={rows} />
        )}
      </div>

      {/* ───────── Mobile stacked cards (< --bp-md) — LIS-0 / LN4-0 ───────── */}
      <div data-testid="opening-mobile" className="flex md:hidden flex-col grow">
        {/* 3.1 Header line (the shell provides hamburger + "Prosper" title;
            the green "• Day 1" pill is shell chrome the mobile shell does not
            render on this route — dropped per handoff §3.1, not load-bearing). */}
        <div className="flex flex-col gap-(--sp-1) pb-(--sp-5)">
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Stock &amp; Reconciliation
          </div>
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            Day 1 Opening Stock — {businessDate}
          </div>
        </div>

        {/* 3.2 InstructionalBanner (step 1), stacked. */}
        <InstructionalBanner
          step={1}
          title="Day 1 Opening Stock Count"
          body={
            <span className="flex flex-col gap-(--sp-3)">
              <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                Enter the physical count for each item at its home location. A
                re-entered count is saved as a correction of the first.
              </span>
              <span className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
                {visibleProducts.length} items
              </span>
            </span>
          }
        />

        {loadError && (
          <div role="alert" className="font-ui text-danger text-body/sm mt-(--sp-5)">
            {loadError}
          </div>
        )}

        {/* 3.3 Category chip strip — horizontally scrollable (8Q4-0 pattern),
            not kit <Tabs>. */}
        <div
          role="tablist"
          aria-label="Filter by category"
          className="flex items-center gap-(--sp-4) overflow-x-auto pt-(--sp-6) pb-(--sp-5)"
        >
          {TABS.map((t) => {
            const active = t.key === activeTab;
            const count =
              t.key === "all"
                ? products.length
                : products.filter((p) => p.kind === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center justify-center h-[32px] shrink-0 px-(--sp-6) rounded-lg whitespace-nowrap font-ui text-sm/sm kit-interactive kit-focus-ring ${
                  active
                    ? "bg-(--surface-selected) text-accent font-(--weight-medium)"
                    : "border border-solid [border-color:var(--border-strong)] [color:var(--text-secondary)]"
                }`}
              >
                {active ? `${t.label} (${count})` : t.label}
              </button>
            );
          })}
        </div>

        {/* 3.4 Card list / states. */}
        {loading ? (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col p-(--sp-6) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-start justify-between gap-(--sp-4)">
                  <div className="kit-skeleton h-[16px] w-[140px] rounded-sm" />
                  <div className="kit-skeleton h-[12px] w-[64px] rounded-sm" />
                </div>
                <div className="kit-skeleton h-[10px] w-[96px] rounded-sm" />
                <div className="kit-skeleton h-[44px] w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            title="No items in this category"
            description="Switch tabs, or add products in the Catalog first."
          />
        ) : (
          <div className="flex flex-col">
            {visibleProducts.map((p) => {
              const rs = rowState[p.id];
              const status = rs?.status;
              const isError = status === "error";
              const value = rowTotalValue(p, rs);
              const homeLabel = homeLocationLabel(p.kind);
              const errId = `opening-err-${p.id}`;

              return (
                <div
                  key={p.id}
                  className="flex flex-col p-(--sp-6) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  {/* Row 1 — name + right-aligned category label. */}
                  <div className="flex items-start gap-(--sp-4)">
                    <div className="flex flex-col grow min-w-0 gap-(--sp-1)">
                      <div className="font-ui font-(--weight-medium) truncate [color:var(--text-primary)] text-body/body">
                        {p.name}
                      </div>
                      {/* Row 2 — meta line. */}
                      <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                        {homeLabel} · per {p.unitLabel}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 w-max font-ui font-(--weight-medium) text-caption/micro ${
                        p.kind === "ingredient" ? "text-info" : "text-warning"
                      }`}
                    >
                      {CATEGORY_LABEL[p.kind]}
                    </div>
                  </div>

                  {/* Row 3 — input row. */}
                  <div className="flex flex-col gap-(--sp-3)">
                    <div className="text-[10px] [letter-spacing:var(--tracking-caps)] uppercase font-ui font-(--weight-semibold) [color:var(--text-tertiary)]">
                      Count at {homeLabel}
                    </div>
                    <div className="flex items-center gap-(--sp-4)">
                      <div
                        className="flex items-center h-[44px] flex-1 min-w-0 px-(--sp-5) rounded-md kit-field"
                        data-invalid={isError || undefined}
                      >
                        <input
                          inputMode="decimal"
                          aria-label={`${p.name} — ${homeLabel}`}
                          aria-invalid={isError || undefined}
                          aria-describedby={isError ? errId : undefined}
                          value={rs?.input ?? ""}
                          onChange={(e) => setInput(p.id, e.target.value)}
                          placeholder="0.0"
                          className={`w-full bg-transparent outline-none font-mono text-[15px] leading-sm placeholder:[color:var(--text-disabled)] ${
                            isError
                              ? "font-(--weight-semibold) text-danger"
                              : "font-(--weight-semibold) [color:var(--text-primary)]"
                          }`}
                        />
                        <span className="shrink-0 font-mono [color:var(--text-tertiary)] text-sm/micro">
                          {p.unitLabel}
                        </span>
                      </div>

                      {/* Fixed 76px right-lane readout. */}
                      <div className="flex items-center justify-end shrink-0 w-[76px] gap-(--sp-2) text-right font-mono font-(--weight-medium) text-micro leading-[14px]">
                        {status === "saved" ? (
                          <span className="flex items-center gap-(--sp-2) text-success">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              aria-hidden
                              style={{ flexShrink: 0 }}
                            >
                              <polyline
                                points="20 6 9 17 4 12"
                                fill="none"
                                stroke="var(--color-success)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Saved
                          </span>
                        ) : status === "corrected" ? (
                          <span className="flex items-center gap-(--sp-2) text-warning">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              aria-hidden
                              style={{ flexShrink: 0 }}
                            >
                              <path
                                d="M1 4v6h6M23 20v-6h-6"
                                fill="none"
                                stroke="var(--color-warning)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
                                fill="none"
                                stroke="var(--color-warning)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Corrected
                          </span>
                        ) : p.kind === "dish" ? (
                          <span className="[color:var(--text-tertiary)]">Dish</span>
                        ) : value === "—" ? (
                          <span className="[color:var(--text-tertiary)]">—</span>
                        ) : (
                          <span className="[color:var(--text-primary)]">
                            KES {value}
                          </span>
                        )}
                      </div>
                    </div>

                    {isError && (
                      <div
                        id={errId}
                        className="font-ui text-danger text-caption/micro"
                      >
                        {rs?.message ?? "Enter a quantity of zero or more."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3.5 Consolidated valuation strip. */}
        <div className="flex flex-col my-(--sp-6) py-(--sp-5) px-(--sp-6) rounded-md gap-(--sp-4) bg-gray-900">
          <div className="text-[10px] [letter-spacing:var(--tracking-caps)] uppercase font-ui font-(--weight-medium) text-(--nav-text-subtle)">
            Consolidated Day 1 Valuation
          </div>
          <div className="flex flex-wrap gap-x-(--sp-6) gap-y-(--sp-3)">
            <div className="flex items-baseline gap-(--sp-3)">
              <span className="font-ui text-(--nav-text-subtle) text-caption/micro">
                Raw stock
              </span>
              <span className="font-mono font-(--weight-semibold) text-white text-sm/micro">
                KES {valuation.anyDirty ? kes(valuation.rawStock) : "0"}
              </span>
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <span className="font-ui text-(--nav-text-subtle) text-caption/micro">
                Dishes
              </span>
              <span className="font-mono font-(--weight-semibold) text-white text-sm/micro">
                {valuation.dishCount} pcs
              </span>
            </div>
          </div>
          <div className="h-px shrink-0 bg-(--nav-bg-divider-strong)" />
          <div className="flex items-baseline justify-between">
            <span className="font-ui text-(--nav-text-subtle) text-caption/micro">
              Consolidated
            </span>
            {/* Muted until a count is entered (handoff §3.5 / §C26); green once
                the baseline has any value. */}
            <span
              className={`font-mono font-(--weight-semibold) text-body/sm ${
                valuation.anyDirty ? "text-success" : "text-(--nav-text-subtle)"
              }`}
            >
              KES {kes(valuation.consolidated)}
            </span>
          </div>
        </div>

        {/* 3.6 Sticky bottom bar — `sticky` keeps it in flow (occupies its own
            height at scroll-end), so no absolute-positioning spacer is needed. */}
        <div className="sticky bottom-0 flex items-center gap-(--sp-5) px-(--sp-6) pt-(--sp-5) pb-(--sp-7) -mx-(--sp-8) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <Button
            variant="tertiary"
            onClick={() => router.push("/admin/stock")}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={submit}
            disabled={pendingCount === 0 || submitting}
            loading={submitting}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
