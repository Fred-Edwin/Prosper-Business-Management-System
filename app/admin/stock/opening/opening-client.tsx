// Session 11 rebuild — COMPOSED from the kit, no longer a transcription of Paper
// artboard 7UD-0. Assembled from <PageShell> + <Breadcrumb> +
// <InstructionalBanner> + <Tabs> + <BulkEntryGrid> + <Toast> (one per save batch).
//
// The data path is unchanged: the catalog fetch, one editable cell per
// (product, its home location), the per-row dirty state, planOpeningPosts, and
// the submit — one POST /api/stock-movements { movementType: "opening" } per
// dirty row (a re-submit is a correction server-side, ADR-15 / ADR-39) — are
// verbatim.
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/kit/page-shell";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { BulkEntryGrid, type BulkGridRow } from "@/components/kit/bulk-entry-grid";
import { Tabs } from "@/components/kit/tabs";
import { Button } from "@/components/kit/button";
import { useToast } from "@/components/kit/toast";
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

  return (
    <PageShell
      wide
      toolbar={
        <>
          <Breadcrumb
            items={[
              { label: "Stock & Reconciliation", href: "/admin/stock" },
              { label: `Day 1 Opening Stock — ${businessDate}` },
            ]}
          />
          <div className="grow" />
          <div className="flex items-center shrink-0 gap-(--sp-4)">
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
              {pendingCount > 0
                ? `Save ${pendingCount} Opening ${pendingCount === 1 ? "Count" : "Counts"}`
                : "Save Baseline & Initialize Day 1"}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col grow gap-(--sp-8)">
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
    </PageShell>
  );
}
