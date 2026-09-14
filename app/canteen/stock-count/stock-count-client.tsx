"use client";

// K1 — Canteen Stock Count screen (mobile — 390px viewport).
//
// REWORK (client UX request, 2026-09-14): the attendant reported the old
// two-screen flow (Select → navigate → stepper → Confirm → navigate back,
// per product) took too many taps to count a shelf of products, and asked
// to see what the system expects on hand per item. This rebuild:
//
//   - ONE screen. Search + category tabs + a list of rows, each already
//     showing "Expected: N unit" (the derived canteen balance, same
//     `useStockLevels` read the sibling Store-Manager / Canteen movement
//     flows use — `staff-stock-movements-flow.md`).
//   - Tap a row → it expands IN PLACE with a compact stepper defaulted to
//     the expected value (confirming "still N" is one tap; counting down
//     is a few). No navigation.
//   - Any number of rows can be open at once; one sticky "Confirm N
//     counts" submits the whole batch in one atomic call
//     (`POST /api/canteen/stock-counts/batch`, ADR-72 companion — see
//     `lib/domain/sales/record-stock-count.ts` `recordStockCountBatch`).
//   - A row whose typed count exceeds its expected stock gets the same
//     inline danger treatment + disables the sticky submit as the
//     movement-flow `SelectableProductRow` BLOCKED state (§9.8 parity) —
//     not forked into the kit (CLAUDE.md: the kit is frozen), it's a
//     screen-local row built to the same visual/interaction contract but
//     with K1's own semantics: "expected 0" is a normal, selectable state
//     (a movement row's "zero available" is inert — wrong for a count,
//     where 0 expected is exactly when you'd confirm "still zero").
//
// Kit components: QuantityStepper interaction contract (compact inline
// variant, screen-local — same deviation `SelectableProductRow` already
// documents), CalculatedImpactBanner, SearchInput, Button, ErrorState.
// No kit change.

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/kit/button";
import { useToast } from "@/components/kit/toast";
import { ErrorState } from "@/components/kit/error-state";
import { cn } from "@/lib/utils";
import {
  useStockCountActions,
  StockCountRequestError,
} from "../use-stock-count";
import { useCanteenProducts, type CanteenProduct } from "../use-canteen-products";
import { useStaffStock, useStockLevels } from "@/app/store-manager/use-staff-stock";

// ── Display helpers ────────────────────────────────────────────────────

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

// ── K1 main component ──────────────────────────────────────────────────

type CountedLine = { quantity: number };

export function StockCountClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, loading: productsLoading, error: productsError } =
    useCanteenProducts();
  const { recordStockCountBatch } = useStockCountActions();

  // The attendant's own canteen id — resolved client-side from the
  // server-scoped `useStaffStock` read, same pattern as
  // `app/canteen/transfer/receive/receive-transfer-flow.tsx`.
  const { data: staffData } = useStaffStock();
  const myLocationId =
    staffData.locations.find((l) => l.type === "canteen")?.id ??
    staffData.movements[0]?.locationId ??
    null;

  const { rows: stockLevels, loading: levelsLoading } = useStockLevels(
    myLocationId || undefined,
  );
  const expectedById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stockLevels) {
      m.set(r.productId, Number.parseFloat(r.quantity) || 0);
    }
    return m;
  }, [stockLevels]);

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [counted, setCounted] = React.useState<Map<string, CountedLine>>(new Map());
  const [submitting, setSubmitting] = React.useState(false);

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) if (p.category) cats.add(p.category);
    return [...cats].sort();
  }, [products]);

  const filtered = React.useMemo(() => {
    let out = products;
    if (activeCategory) out = out.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(q));
    }
    return out;
  }, [products, activeCategory, query]);

  function expectedFor(productId: string): number {
    return expectedById.get(productId) ?? 0;
  }

  function openRow(productId: string) {
    setCounted((prev) => {
      const next = new Map(prev);
      next.set(productId, { quantity: expectedFor(productId) });
      return next;
    });
  }

  function closeRow(productId: string) {
    setCounted((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setCounted((prev) => {
      const next = new Map(prev);
      next.set(productId, { quantity: Math.max(0, quantity) });
      return next;
    });
  }

  // Any open row whose typed count exceeds its expected stock blocks the
  // whole batch submit (§9.8 parity — nothing is written while blocked).
  const blockedProductIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const [productId, line] of counted) {
      if (line.quantity > expectedFor(productId)) ids.add(productId);
    }
    return ids;
  }, [counted, expectedById]);

  const countedCount = counted.size;
  const blocked = blockedProductIds.size > 0;
  const canConfirm = countedCount > 0 && !blocked && !submitting;

  const summaryText = React.useMemo(() => {
    if (blocked) {
      return "1 or more items are counted higher than expected stock. Fix them to continue.";
    }
    if (countedCount === 0) {
      return "Tap a product to count it. Counted items are queued below — confirm once you're done.";
    }
    const plural = countedCount === 1 ? "item" : "items";
    return `${countedCount} ${plural} counted and ready to confirm.`;
  }, [blocked, countedCount]);

  async function confirmCounts() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    try {
      const lines = [...counted.entries()].map(([productId, line]) => ({
        productId,
        countedQuantity: String(line.quantity),
      }));
      await recordStockCountBatch(lines);
      toast(
        countedCount === 1
          ? "Stock count recorded for 1 item"
          : `Stock counts recorded for ${countedCount} items`,
        { tone: "success" },
      );
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof StockCountRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't record the counts.";
      toast(msg, { tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col grow min-h-0 bg-(--surface-page)">
      {/* Header — back arrow + "Stock Count" title */}
      <div className="flex items-center h-(--control-xl) px-(--sp-6) gap-(--sp-4) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="kit-focus-ring rounded-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
            <line x1="19" y1="12" x2="5" y2="12" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="12 19 5 12 12 5" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/body">
          Stock Count
        </h1>
      </div>

      {productsError ? (
        <div className="flex flex-col p-(--sp-6)">
          <ErrorState title="Couldn't load products" description={productsError} />
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="mx-(--sp-6) mt-(--sp-5) mb-(--sp-5)">
            <SearchInput
              id="k1-product-search"
              placeholder="Search canteen products"
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
            />
          </div>

          {/* Category tabs */}
          <div className="flex px-(--sp-6) gap-(--sp-7) border-b border-b-solid [border-bottom-color:var(--border-subtle)] overflow-x-auto shrink-0">
            <CategoryTab
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryTab
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          {/* Product list */}
          <div className="flex flex-col grow min-h-0 overflow-y-auto p-(--sp-4) gap-(--sp-3)">
            {productsLoading || levelsLoading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-[56px] px-(--sp-4) rounded-lg border border-solid [border-color:var(--border-subtle)]">
                  <div className="kit-skeleton h-[14px] w-[120px]" />
                  <div className="kit-skeleton h-[28px] w-[64px]" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] font-ui [color:var(--text-tertiary)] text-sm/sm px-(--sp-6) text-center">
                {query ? "No products match your search." : "No canteen products found."}
              </div>
            ) : (
              filtered.map((p) => (
                <CountRow
                  key={p.id}
                  product={p}
                  expected={expectedFor(p.id)}
                  countedQty={counted.get(p.id)?.quantity ?? null}
                  blocked={blockedProductIds.has(p.id)}
                  onOpen={() => openRow(p.id)}
                  onClose={() => closeRow(p.id)}
                  onQuantityChange={(v) => setQuantity(p.id, v)}
                />
              ))
            )}
          </div>

          {/* Batch summary banner */}
          <div className="px-(--sp-6) pb-(--sp-4)" data-testid="k1-batch-summary">
            <CalculatedImpactBanner
              className={blocked ? "bg-danger-bg" : undefined}
            >
              <span className={blocked ? "text-danger" : undefined}>
                {summaryText}
              </span>
            </CalculatedImpactBanner>
          </div>
        </>
      )}

      {/* Sticky footer — "Confirm N counts" */}
      <div className="flex items-center shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button
          id="k1-confirm-count"
          variant="primary"
          size="lg"
          disabled={!canConfirm}
          loading={submitting}
          onClick={confirmCounts}
          className="w-full"
        >
          {countedCount > 0
            ? `Confirm ${countedCount} ${countedCount === 1 ? "count" : "counts"}`
            : "Confirm counts"}
        </Button>
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center h-[36px] shrink-0 kit-focus-ring",
        active
          ? "font-ui font-(--weight-semibold) text-accent border-b-2 border-b-solid border-b-accent"
          : "font-ui [color:var(--text-secondary)] text-sm/sm",
      ].join(" ")}
    >
      {active ? (
        <span className="font-ui font-(--weight-semibold) text-accent text-sm/sm">{label}</span>
      ) : (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">{label}</span>
      )}
    </button>
  );
}

// ── Row — in-place counting, no navigation ─────────────────────────────
//
// Same visual/interaction contract as `components/kit/selectable-product-row.tsx`
// (compact `− [n] +` inline stepper, accent-tint selected state, danger
// BLOCKED state) but NOT that component: K1's "expected" figure is not an
// availability ceiling to select against — 0 expected is a normal,
// countable state (confirming "still nothing on the shelf"), where the
// kit component's zero-available state is deliberately inert. Forking
// that semantic into the frozen kit is an owner conversation (CLAUDE.md);
// this is a screen-local row built to the same look, not a kit change.

function CountRow({
  product,
  expected,
  countedQty,
  blocked,
  onOpen,
  onClose,
  onQuantityChange,
}: {
  product: CanteenProduct;
  expected: number;
  countedQty: number | null;
  blocked: boolean;
  onOpen: () => void;
  onClose: () => void;
  onQuantityChange: (v: number) => void;
}) {
  const isOpen = countedQty !== null;
  const unit = product.unitLabel;
  const [editing, setEditing] = React.useState<string | null>(null);

  if (!isOpen) {
    return (
      <div
        role="group"
        aria-label={`${product.name}, expected ${fmtQty(expected)} ${unit}`}
        className="flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]"
      >
        <div className="grow min-w-0 flex flex-col gap-px">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
            {product.name}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {[product.category, product.unitLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro">
          Expected: {fmtQty(expected)} {unit}
        </span>
        <span className="shrink-0 basis-[92px] flex justify-end">
          <Button
            id={`k1-select-${product.id}`}
            size="sm"
            variant="secondary"
            onClick={onOpen}
          >
            Select
          </Button>
        </span>
      </div>
    );
  }

  const display = editing ?? fmtQty(countedQty);

  function commit(raw: string) {
    const n = Number.parseFloat(raw);
    onQuantityChange(Number.isNaN(n) ? 0 : n);
    setEditing(null);
  }

  return (
    <div
      role="group"
      aria-label={`${product.name}, expected ${fmtQty(expected)} ${unit}, counted ${fmtQty(countedQty)} ${unit}${blocked ? ", exceeds expected stock" : ""}`}
      data-blocked={blocked || undefined}
      className={cn(
        "flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid",
        blocked ? "bg-danger-bg border-danger" : "bg-(--surface-selected) border-accent",
      )}
    >
      <div className="flex items-center gap-[8px]">
        <div className="grow min-w-0 flex flex-col gap-px">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
            {product.name}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Expected: {fmtQty(expected)} {unit}
          </span>
        </div>

        <div
          className={cn(
            "flex items-center h-[32px] rounded-md overflow-clip shrink-0 bg-(--surface-page) border border-solid",
            blocked ? "border-danger" : "[border-color:var(--border-strong)]",
          )}
        >
          <button
            type="button"
            disabled={countedQty <= 0}
            onClick={() => onQuantityChange(countedQty - 1)}
            aria-label="Decrease"
            tabIndex={-1}
            className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
          >
            −
          </button>
          <span className="flex items-center justify-center min-w-[48px] h-[30px] px-[4px] shrink-0 border-x border-x-solid [border-color:var(--border-subtle)]">
            <input
              type="text"
              inputMode="decimal"
              role="spinbutton"
              aria-label={`${product.name} counted quantity`}
              aria-valuenow={countedQty}
              aria-valuemin={0}
              aria-invalid={blocked || undefined}
              value={display}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  onQuantityChange(countedQty + 1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  onQuantityChange(Math.max(0, countedQty - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  commit((e.target as HTMLInputElement).value);
                }
              }}
              className={cn(
                "w-max min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-medium) [font-feature-settings:'tnum'] text-sm/micro",
                blocked ? "text-danger" : "[color:var(--text-primary)]",
              )}
              style={{ width: `${Math.max(display.length, 2)}ch` }}
            />
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(countedQty + 1)}
            aria-label="Increase"
            tabIndex={-1}
            className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
          >
            +
          </button>
        </div>

        <button
          type="button"
          id={`k1-remove-${product.id}`}
          onClick={onClose}
          className="font-ui font-(--weight-medium) text-accent text-sm/sm shrink-0 kit-focus-ring rounded-sm"
        >
          Remove
        </button>
      </div>

      {blocked && (
        <p className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          Only {fmtQty(expected)} {unit} expected — reduce the count or check for a missing receipt/transfer.
        </p>
      )}
    </div>
  );
}
