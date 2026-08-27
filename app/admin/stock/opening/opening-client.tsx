// Wired from docs/design/screens/bulk-opening-stock-grid/page.tsx (Paper
// artboard 7UD-0). Markup + classes — the breadcrumb toolbar, the numbered
// instruction banner, kit <Tabs>, kit <BulkEntryGrid>, the inline valuation
// footer — are verbatim from the skeleton. The skeleton's own sidebar is
// dropped (app/admin/layout.tsx wraps this route in <AdminShell>).
//
// This file adds: one editable cell per (product, its home location), a
// per-row dirty state, and the submit — one POST /api/stock-movements
// { movementType: "opening", … } per dirty row. A second submit for the same
// product/location/date is a correction server-side (ADR-15 / ADR-39); the
// row reflects that as "corrected".
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BulkEntryGrid, type BulkGridRow } from "@/components/kit/bulk-entry-grid";
import { Tabs } from "@/components/kit/tabs";
import { toBusinessDate } from "@/lib/time";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { ProductKind } from "@prisma/client";
import { stockApi, StockRequestError } from "../use-stock";
import { homeLocationType, planOpeningPosts } from "./opening-plan";

const CATEGORY_LABEL: Record<ProductKind, string> = {
  ingredient: "Ingredient",
  dish: "Dish (Finished)",
  goods: "Shop Goods",
};

const TABS = [
  { key: "all", label: "All Items" },
  { key: "ingredient", label: "Kitchen Ingredients" },
  { key: "dish", label: "Dishes" },
  { key: "goods", label: "Shop Goods" },
];

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
  const businessDate = toBusinessDate(new Date());

  const [products, setProducts] = React.useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [activeTab, setActiveTab] = React.useState("all");
  const [rowState, setRowState] = React.useState<Record<string, RowState>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [banner, setBanner] = React.useState<string | null>(null);

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

    const totalValue =
      p.buyingPrice && cellVal && /^\d+(\.\d+)?$/.test(cellVal.trim())
        ? (Number(p.buyingPrice) * Number(cellVal)).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : rs?.status === "saved" || rs?.status === "corrected"
          ? rs.status === "corrected"
            ? "corrected"
            : "saved"
          : "—";

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
      totalValue,
    };
  });

  const plannedPosts = React.useMemo(
    () => planOpeningPosts(rowState, products, locations, businessDate),
    [rowState, products, locations, businessDate],
  );

  async function submit() {
    if (plannedPosts.length === 0 || submitting) return;
    setSubmitting(true);
    setBanner(null);

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
    setSubmitting(false);
    setBanner(
      failed === 0
        ? `Saved ${results.length} opening ${
            results.length === 1 ? "count" : "counts"
          } for ${businessDate}.`
        : `${results.length - failed} saved, ${failed} failed — see the highlighted rows.`,
    );
  }

  const pendingCount = plannedPosts.length;

  return (
    <div className="flex flex-col grow min-w-[0px] self-stretch w-[1200px] max-w-[1200px] overflow-clip">
      {/* Toolbar */}
      <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center shrink-0 gap-(--sp-3)">
          <div className="font-ui inline-block [color:var(--text-tertiary)] text-sm/sm">
            Stock &amp; Reconciliation
          </div>
          <div className="font-ui inline-block [color:var(--text-tertiary)] text-body/sm">/</div>
          <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/sm">
            Day 1 Opening Stock — {businessDate}
          </div>
        </div>
        <div className="grow" />
        <div className="flex items-center shrink-0 gap-(--sp-4)">
          <button
            type="button"
            onClick={() => router.push("/admin/stock")}
            className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
          >
            <span className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
              Discard &amp; Back
            </span>
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pendingCount === 0 || submitting}
            className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-accent kit-interactive kit-focus-ring disabled:opacity-50"
          >
            <span className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
              {submitting
                ? "Saving…"
                : pendingCount > 0
                  ? `Save ${pendingCount} Opening ${pendingCount === 1 ? "Count" : "Counts"}`
                  : "Save Baseline & Initialize Day 1"}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[1200px] max-w-[1200px] overflow-clip">
        {/* Instruction banner (inline — see skeleton header comment) */}
        <div className="flex items-center py-(--sp-5) px-(--sp-6) gap-(--sp-5) [width:100%] max-w-full justify-between bg-(--surface-selected)">
          <div className="flex items-center justify-center w-[28px] h-[28px] shrink-0 rounded-[50%] bg-accent">
            <div className="font-ui font-(--weight-semibold) text-white text-sm/micro">1</div>
          </div>
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) text-accent text-sm/sm">
              Day 1 Opening Stock Count
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
              Enter the physical count for each item at its home location. A
              re-entered count is saved as a correction of the first.
            </div>
          </div>
          <div className="font-ui font-(--weight-medium) shrink-0 inline-block w-max [color:var(--text-secondary)] text-sm/sm">
            {visibleProducts.length} Items
          </div>
        </div>

        {loadError && (
          <div className="font-ui text-danger text-body/sm">{loadError}</div>
        )}
        {banner && (
          <div className="font-ui text-info text-body/sm">{banner}</div>
        )}

        {/* Tabs */}
        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} className="[width:100%]" />

        {/* Entry grid */}
        {loading ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm">Loading…</div>
        ) : (
          <BulkEntryGrid rows={rows} />
        )}
      </div>
    </div>
  );
}
