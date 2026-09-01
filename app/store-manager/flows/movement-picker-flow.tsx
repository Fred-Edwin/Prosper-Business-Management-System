"use client";

// Store Manager — the shared multi-row movement picker (M2-3c, ADR-44
// body reversal → Option A). The FlowScaffold chrome (FlowHeader +
// scrolling body + sticky submit) is unchanged; this is the body the
// owner reverted from the one-line form back to the Paper drawings
// (artboards [M2-3D]: JXC-0 / JNK-0 / K5X-0 / KE5-0 / KN6-0).
//
// Body, top → bottom (flow doc §"Body composition"):
//   1. Receive only — a "Deliveries awaiting receipt" <MatchCard> list;
//      "Match this delivery" pre-fills a selected row + links the line.
//   2. <SearchInput> over the location's product set (per-flow copy).
//   3. Category <Tabs> — Transfer only in practice.
//   4. <SelectableProductRow> list — `available` from the derived balance
//      at the SM's location; a blocked row raises `onBlockedChange`,
//      which disables the sticky submit.
//   5. Per-flow secondary fields (Transfer destination; Non-sale reason +
//      note).
//   6. Impact preview — <CalculatedImpactBanner> that sums the whole
//      batch, or an inline danger-tinted banner when a row is blocked
//      (matches the [M2-3D] blocked artboards; §9.8 parity with the
//      cashier over-stock banner — no kit change).
//   7. Sticky submit — label carries the signed batch total; fires ONE
//      batch POST for the whole batch.
//
// The 5 flow screens are thin `mode` wrappers around this component; the
// per-flow copy / secondary fields / endpoint live in FLOW_CONFIG.

import * as React from "react";
import { useRouter } from "next/navigation";
import type { NonSaleReason, StockMovementView } from "@/lib/domain/stock";
import { SearchInput } from "@/components/kit/search-input";
import { Tabs } from "@/components/kit/tabs";
import { SelectableProductRow } from "@/components/kit/selectable-product-row";
import { Select } from "@/components/kit/select";
import { Textarea } from "@/components/kit/textarea";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { MatchCard } from "@/components/kit/match-card";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  useStockLevels,
  useTransferSourceLevels,
  useOutstandingDeliveries,
  stockApi,
  StockRequestError,
  type BatchLine,
} from "../use-staff-stock";
import { trimQty } from "../staff-stock-format";
import { useCanteenProducts } from "@/app/canteen/use-canteen-products";
import { FlowScaffold } from "./flow-scaffold";

export type MovementMode =
  | "receive"
  | "issue"
  | "production"
  | "transfer"
  | "non-sale"
  // M2-3d: the Canteen Transfer Dispatch flow. Behaves exactly like
  // `transfer` (multi-row picker, category tabs, a Destination <Select>,
  // the two-phase-transfer rule, POST …/transfers/batch) but the SOURCE
  // is the Canteen, not the Store: balances, the batch `fromLocationId`
  // and the "Canteen → {dest}" badge all read the Canteen. Role: Canteen
  // Attendant (+ Admin). On success it returns to `/canteen`.
  | "dispatch";

/** Modes whose source location is the Canteen (not the Store). */
const CANTEEN_SOURCED = new Set<MovementMode>(["dispatch"]);
/**
 * `transfer` (SM → Canteen) is **per-product multi-source**: cooked dishes
 * dispatch from the Restaurant (where Batch Production lands them), sodas /
 * shop goods dispatch from the Store (where deliveries land). There is no
 * single source location — the row `available` and the phase-1 dispatch
 * are both resolved per product by `useTransferSourceLevels` (a dish reads
 * / leaves the Restaurant; everything else the Store). The badge shows
 * "Store / Restaurant → {dest}". (An earlier fix made the whole flow
 * Restaurant-sourced, which zeroed every goods row — reverted here.)
 */
const MULTI_SOURCED = new Set<MovementMode>(["transfer"]);

// ── Per-flow configuration ─────────────────────────────────────────────

const NON_SALE_REASONS: { value: NonSaleReason; label: string }[] = [
  { value: "staff_meal", label: "Staff meal / tea preparation" },
  { value: "complimentary", label: "Complimentary" },
  { value: "spoiled", label: "Spoiled" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other (note required)" },
];

type FlowConfig = {
  title: string;
  direction: string;
  tone: "success" | "danger" | "info" | "warning";
  /** Which products the picker lists.
   *  - "non-dish"      → ingredients + goods (into-the-kitchen / delivery flows)
   *  - "dish"          → dishes only (production)
   *  - "dish-or-goods" → sellable output: dishes + goods, never raw ingredients
   *                       (SM → Canteen transfer)
   *  - "all"           → the whole catalogue (write-offs)
   *  - "canteen"       → the canteen-sellable set, fetched from
   *                       GET /api/canteen/products (Canteen dispatch) */
  productKinds: "non-dish" | "dish" | "dish-or-goods" | "all" | "canteen";
  searchPlaceholder: string;
  sectionLabel: string;
  /** `SelectableProductRow.availableLabelPrefix`. The kit only supports a
   * prefix, so a flow-doc suffix ("N in Rest.") ships as a prefix
   * ("Available:") — cosmetic delta, logged for QA. */
  availPrefix: string;
  /** `true` ⇒ spend flow: the row stepper is bounded by `available` and an
   * over-available quantity BLOCKS. `false` ⇒ additive: unbounded, only a
   * blank/zero quantity blocks. */
  spend: boolean;
  /** Show the `All · Beverages & Soda · Shop Goods` category tab row. */
  categoryTabs: boolean;
  /** `EmptyState` copy when the location has no products for this flow. */
  emptyTitle: string;
  emptyDescription: string;
  /** `ErrorState` copy. */
  errorTitle: string;
};

export const FLOW_CONFIG: Record<MovementMode, FlowConfig> = {
  receive: {
    title: "Receive Goods",
    direction: "Supplier → Store",
    tone: "success",
    productKinds: "non-dish",
    searchPlaceholder: "Search products…",
    sectionLabel: "Products delivered",
    availPrefix: "On hand:",
    spend: false,
    categoryTabs: false,
    emptyTitle: "No products set up",
    emptyDescription:
      "Add ingredients or goods in the Catalog before recording a delivery.",
    errorTitle: "Couldn't load Store stock",
  },
  issue: {
    title: "Issue Ingredients",
    direction: "Store → Kitchen",
    tone: "danger",
    productKinds: "non-dish",
    searchPlaceholder: "Search ingredients at Store…",
    sectionLabel: "Select ingredients to issue",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: false,
    emptyTitle: "No ingredients at Store",
    emptyDescription:
      "Nothing is stocked at the Store yet — record a delivery first.",
    errorTitle: "Couldn't load Store stock",
  },
  production: {
    title: "Record Batch Production",
    direction: "Kitchen → Restaurant",
    tone: "success",
    productKinds: "dish",
    searchPlaceholder: "Search dishes…",
    sectionLabel: "Select dishes produced",
    availPrefix: "Available:",
    spend: false,
    categoryTabs: false,
    emptyTitle: "No dishes set up",
    emptyDescription: "Add dishes in the Catalog before logging production.",
    errorTitle: "Couldn't load dishes",
  },
  transfer: {
    title: "Transfer Stock",
    direction: "Store / Restaurant → …",
    tone: "info",
    // The SM sends sellable output to the Canteen — cooked dishes + shop
    // goods (sodas, snacks, packaged items), never raw ingredients. Each
    // line dispatches from its own true source: dishes from the Restaurant
    // (Batch Production's landing spot), goods from the Store (deliveries).
    // See MULTI_SOURCED / useTransferSourceLevels.
    productKinds: "dish-or-goods",
    searchPlaceholder: "Search sodas, goods, stock…",
    sectionLabel: "Select items to transfer",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: true,
    emptyTitle: "Nothing to transfer",
    emptyDescription: "There's no sellable stock to send right now.",
    errorTitle: "Couldn't load stock",
  },
  "non-sale": {
    title: "Log Non-Sale",
    direction: "Staff meals & spoilage",
    tone: "warning",
    // Anything at the Store can be written off — ingredients, dishes, goods
    // (staff meals, spoilage, damage). FIX-1 FIX A (already "all"; kept).
    productKinds: "all",
    searchPlaceholder: "Search items to log…",
    sectionLabel: "Select items to log",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: false,
    emptyTitle: "Nothing to log",
    emptyDescription: "The Store has no stock on hand to write off.",
    errorTitle: "Couldn't load Store stock",
  },
  dispatch: {
    title: "Transfer Stock",
    direction: "Canteen → …",
    tone: "info",
    // The Canteen Attendant can only dispatch what the Canteen actually
    // sells — the canteen-sellable set (active ProductLocation at the
    // canteen), from GET /api/canteen/products. FIX-1 FIX C.
    productKinds: "canteen",
    searchPlaceholder: "Search sodas, goods, stock…",
    sectionLabel: "Select items to transfer",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: true,
    emptyTitle: "Nothing to transfer",
    emptyDescription: "The Canteen has no stock to send right now.",
    errorTitle: "Couldn't load Canteen stock",
  },
};

// The Transfer category tab row (flow doc §"Body composition" item 3).
const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "Beverages & Soda", label: "Beverages & Soda" },
  { key: "Shop Goods", label: "Shop Goods" },
];

// ── Batch total helpers ───────────────────────────────────────────────

type Line = { productId: string; quantity: number };

function formatQty(n: number): string {
  return trimQty(String(n));
}

export function MovementPickerFlow({ mode }: { mode: MovementMode }) {
  const cfg = FLOW_CONFIG[mode];
  const router = useRouter();
  const { toast } = useToast();
  const {
    data,
    loading: stockLoading,
    error: stockError,
    refresh,
  } = useStaffStock();

  // The staff member's own location, resolved from the flow's scope.
  const storeLocationId =
    data.locations.find((l) => l.type === "store")?.id ?? "";
  const restaurantLocationId =
    data.locations.find((l) => l.type === "restaurant")?.id ?? "";
  const canteenLocationId =
    data.locations.find((l) => l.type === "canteen")?.id ?? "";
  const isMultiSource = MULTI_SOURCED.has(mode);
  // The SOURCE location for the single-source flows: the Canteen for
  // Dispatch, the Store for every other SM flow. Feeds the batch
  // `locationId` / `fromLocationId`, the destination-picker exclusion, and
  // the badge. `transfer` is multi-source — see MULTI_SOURCED — and does
  // not use this (its per-product source comes from `transferLevels`).
  const sourceLocationId = CANTEEN_SOURCED.has(mode)
    ? canteenLocationId
    : storeLocationId;
  const sourceLabel = CANTEEN_SOURCED.has(mode)
    ? "Canteen"
    : isMultiSource
      ? "Store / Restaurant"
      : "Store";
  // The location whose derived balances feed the row `available` readouts
  // for the SINGLE-source flows: Production reads the Restaurant (the
  // dish's landing stock); Dispatch reads the Canteen; every other reads
  // the Store. `transfer` resolves `available` per product instead.
  const balanceLocationId =
    mode === "production" ? restaurantLocationId : sourceLocationId;

  // `transfer` only: per-product source balance (dish → Restaurant, else
  // → Store). Empty map for every other mode.
  const transferLevels = useTransferSourceLevels(
    isMultiSource ? storeLocationId || undefined : undefined,
    isMultiSource ? restaurantLocationId || undefined : undefined,
  );

  // Canteen dispatch scopes its picker to the canteen-sellable set
  // (GET /api/canteen/products); every other mode lists off `data.products`.
  const isCanteenScoped = cfg.productKinds === "canteen";
  // Only the Canteen dispatch mode may call GET /api/canteen/products
  // (admin + canteen_attendant only) — gate it so the SM modes don't 403.
  const canteen = useCanteenProducts(isCanteenScoped);
  const canteenProductIds = React.useMemo(
    () => new Set(canteen.products.map((p) => p.id)),
    [canteen.products],
  );
  // The dispatch picker also waits on the canteen-products fetch: fold its
  // loading / error into the screen's so it shows skeletons / <ErrorState>
  // the same way, and never flashes an "empty" state mid-fetch.
  const canteenLoading = isCanteenScoped && canteen.loading;
  const loading =
    stockLoading || canteenLoading || (isMultiSource && transferLevels.loading);
  const error =
    stockError ??
    (isCanteenScoped ? canteen.error : null) ??
    (isMultiSource ? transferLevels.error : null);

  const { rows: levelRows } = useStockLevels(
    isMultiSource ? undefined : balanceLocationId || undefined,
  );
  const availableById = React.useMemo(() => {
    const m = new Map<string, number>();
    if (isMultiSource) {
      for (const [pid, lvl] of transferLevels.byProduct) {
        m.set(pid, Number.parseFloat(lvl.quantity));
      }
    } else {
      for (const r of levelRows) {
        m.set(r.productId, Number.parseFloat(r.quantity));
      }
    }
    return m;
  }, [isMultiSource, transferLevels.byProduct, levelRows]);

  // Receive only — deliveries awaiting receipt (non-fatal on failure).
  const outstanding = useOutstandingDeliveries();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [blockedIds, setBlockedIds] = React.useState<Set<string>>(new Set());
  const [destId, setDestId] = React.useState("");
  const [reason, setReason] = React.useState<NonSaleReason | "">("");
  const [note, setNote] = React.useState("");
  const [matchedPaymentByProduct, setMatchedPaymentByProduct] = React.useState<
    Map<string, string>
  >(new Map());
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  // Products in scope for this flow.
  const flowProducts = React.useMemo(
    () =>
      data.products.filter((p) => {
        switch (cfg.productKinds) {
          case "dish":
            return p.kind === "dish";
          case "non-dish":
            return p.kind !== "dish";
          case "dish-or-goods":
            // Sellable output only — cooked dishes + shop goods, never raw
            // ingredients (SM → Canteen transfer). FIX-1 FIX A.
            return p.kind === "dish" || p.kind === "goods";
          case "canteen":
            // The canteen-sellable set, from GET /api/canteen/products.
            return canteenProductIds.has(p.id);
          default:
            return true;
        }
      }),
    [data.products, cfg.productKinds, canteenProductIds],
  );

  // Filtered / searched set that the row list renders.
  const visibleProducts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return flowProducts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (cfg.categoryTabs && category !== "all" && p.category !== category)
        return false;
      return true;
    });
  }, [flowProducts, query, category, cfg.categoryTabs]);

  const lineByProduct = React.useMemo(() => {
    const m = new Map<string, Line>();
    for (const l of lines) m.set(l.productId, l);
    return m;
  }, [lines]);

  // ── Row callbacks ───────────────────────────────────────────────────
  function select(productId: string) {
    const step = 1;
    setLines((prev) =>
      prev.some((l) => l.productId === productId)
        ? prev
        : [...prev, { productId, quantity: step }],
    );
  }
  function deselect(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
    setMatchedPaymentByProduct((prev) => {
      if (!prev.has(productId)) return prev;
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }
  function setQuantity(productId: string, next: number) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: next } : l)),
    );
  }
  const handleBlockedChange = React.useCallback(
    (productId: string, blocked: boolean) => {
      // Additive flows (Receive / Production) cannot over-draw a source
      // balance — see the KIT GAP note on the row list. Ignore the kit's
      // block signal there so it never disables submit.
      if (!cfg.spend) return;
      setBlockedIds((prev) => {
        const has = prev.has(productId);
        if (blocked === has) return prev;
        const next = new Set(prev);
        if (blocked) next.add(productId);
        else next.delete(productId);
        return next;
      });
    },
    [cfg.spend],
  );

  // ── Match a delivery (Receive) ──────────────────────────────────────
  function matchDelivery(payment: StockMovementView) {
    const productId = payment.productId;
    const qty = payment.purchaseOrderedQty
      ? Number.parseFloat(payment.purchaseOrderedQty)
      : 1;
    setLines((prev) => {
      const others = prev.filter((l) => l.productId !== productId);
      return [...others, { productId, quantity: qty }];
    });
    setMatchedPaymentByProduct((prev) => {
      const next = new Map(prev);
      next.set(productId, payment.id);
      return next;
    });
  }

  // ── Validation / batch total ───────────────────────────────────────
  const selectedLines = lines.filter((l) => l.quantity > 0);
  const hasBlankLine = lines.some((l) => !(l.quantity > 0));
  const hasBlockedLine = blockedIds.size > 0;
  const noteRequired = mode === "non-sale" && reason === "other";
  const noteValid = !noteRequired || note.trim() !== "";
  const isTransferLike = mode === "transfer" || mode === "dispatch";
  const secondaryValid = isTransferLike
    ? destId !== ""
    : mode === "non-sale"
      ? reason !== ""
      : true;

  const batchTotal = selectedLines.reduce((sum, l) => sum + l.quantity, 0);
  // One unit label if every selected line shares it; else generic "units".
  const unitLabels = new Set(
    selectedLines.map(
      (l) => data.products.find((p) => p.id === l.productId)?.unitLabel ?? "",
    ),
  );
  const batchUnit =
    unitLabels.size === 1 ? [...unitLabels][0] || "units" : "units";
  // Additive flows (Receive / Production) add to a ledger → `+`; the spend
  // flows (Issue / Transfer / Non-sale / Dispatch) remove → `−`.
  const additive = mode === "receive" || mode === "production";
  const signedTotal = `${additive ? "+" : "−"}${formatQty(batchTotal)} ${batchUnit}`;

  const canSubmit =
    !loading &&
    !error &&
    selectedLines.length > 0 &&
    !hasBlankLine &&
    !hasBlockedLine &&
    noteValid &&
    secondaryValid;

  // ── Submit label (per flow, carries the signed total) ───────────────
  const SUBMIT_VERB: Record<MovementMode, string> = {
    receive: "Confirm Receipt",
    issue: "Confirm Kitchen Issue",
    production: "Log Batch Production",
    transfer: `Dispatch Transfer${destName() ? ` to ${destName()}` : ""}`,
    "non-sale": "Log Non-Sale",
    dispatch: `Dispatch Transfer${destName() ? ` to ${destName()}` : ""}`,
  };
  function destName(): string {
    return data.locations.find((l) => l.id === destId)?.name ?? "";
  }
  // The label carries the signed batch total only while the batch is
  // actually submittable; otherwise it drops to the bare verb.
  const submitLabel = canSubmit
    ? `${SUBMIT_VERB[mode]} (${signedTotal})`
    : SUBMIT_VERB[mode];

  // ── Submit ─────────────────────────────────────────────────────────
  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const plain: BatchLine[] = selectedLines.map((l) => ({
        productId: l.productId,
        quantity: formatQty(l.quantity),
      }));
      let written: StockMovementView[];
      if (mode === "receive") {
        written = await stockApi.receiptBatch({
          locationId: storeLocationId,
          lines: selectedLines.map((l) => ({
            productId: l.productId,
            quantity: formatQty(l.quantity),
            purchasePaymentId: matchedPaymentByProduct.get(l.productId) ?? null,
          })),
        });
      } else if (mode === "issue") {
        written = await stockApi.issueBatch({
          locationId: storeLocationId,
          lines: plain,
        });
      } else if (mode === "production") {
        written = await stockApi.productionBatch({
          locationId: restaurantLocationId,
          lines: plain,
        });
      } else if (isMultiSource) {
        // SM → Canteen transfer: dishes leave the Restaurant, goods leave
        // the Store. Split the batch by each line's true source and fire
        // one phase-1 dispatch per source that has lines.
        const bySource = new Map<string, BatchLine[]>();
        for (const l of plain) {
          const src =
            transferLevels.byProduct.get(l.productId)?.sourceLocationId ??
            storeLocationId;
          const arr = bySource.get(src) ?? [];
          arr.push(l);
          bySource.set(src, arr);
        }
        const batches = await Promise.all(
          [...bySource.entries()].map(([fromLocationId, lines]) =>
            stockApi.transferBatch({ fromLocationId, toLocationId: destId, lines }),
          ),
        );
        written = batches.flat();
      } else if (isTransferLike) {
        // Canteen Dispatch (Canteen → …): single source.
        written = await stockApi.transferBatch({
          fromLocationId: sourceLocationId,
          toLocationId: destId,
          lines: plain,
        });
      } else {
        written = await stockApi.nonSaleBatch({
          locationId: storeLocationId,
          reason: reason as NonSaleReason,
          note,
          lines: plain,
        });
      }
      toast(successToast(mode, written.length, batchTotal, batchUnit, destName()), {
        tone: "success",
      });
      router.push(mode === "dispatch" ? "/canteen" : "/store-manager");
    } catch (e) {
      const msg =
        e instanceof StockRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't record the batch.";
      toast(msg, { tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Direction badge (Transfer / Dispatch track the destination) ─────
  const direction = isTransferLike
    ? `${sourceLabel} → ${destName() || "…"}`
    : cfg.direction;

  // ── error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <FlowScaffold
        title={cfg.title}
        direction={direction}
        directionTone={cfg.tone}
        submitLabel={SUBMIT_VERB[mode]}
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState title={cfg.errorTitle} description={error} onRetry={refresh} />
      </FlowScaffold>
    );
  }

  const showEmpty = !loading && flowProducts.length === 0;

  return (
    <FlowScaffold
      title={cfg.title}
      direction={direction}
      directionTone={cfg.tone}
      submitLabel={submitLabel}
      submitDisabled={!canSubmit}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      {/* Receive — deliveries awaiting receipt (hidden when none / errored) */}
      {mode === "receive" &&
        !outstanding.loading &&
        !outstanding.error &&
        outstanding.rows.length > 0 && (
          <div
            role="list"
            aria-label="Deliveries awaiting receipt"
            className="flex flex-col gap-(--sp-4)"
          >
            <p className="font-ui font-(--weight-semibold) [color:var(--text-tertiary)] text-micro/micro uppercase tracking-[0.04em]">
              Deliveries awaiting receipt
            </p>
            {outstanding.rows.map((p) => {
              const prod = data.products.find((x) => x.id === p.productId);
              const unit = prod?.unitLabel ?? "";
              return (
                <MatchCard
                  key={p.id}
                  supplier={p.purchaseSupplier ?? "Supplier"}
                  status="awaiting"
                  details={[
                    `${prod?.name ?? "Product"} ${
                      p.purchaseOrderedQty ? trimQty(p.purchaseOrderedQty) : "?"
                    } ${unit}`.trim(),
                    p.purchaseTotalCost
                      ? `KES ${p.purchaseTotalCost} · paid by Admin`
                      : "paid by Admin",
                  ]}
                  actionLabel={
                    matchedPaymentByProduct.get(p.productId) === p.id
                      ? "Matched — in this batch"
                      : "Match this delivery"
                  }
                  onAction={() => matchDelivery(p)}
                />
              );
            })}
          </div>
        )}

      {showEmpty ? (
        <EmptyState
          title={cfg.emptyTitle}
          description={cfg.emptyDescription}
        />
      ) : (
        <>
          <SearchInput
            aria-label={cfg.searchPlaceholder}
            placeholder={cfg.searchPlaceholder}
            value={query}
            onChange={setQuery}
            className="w-full"
          />

          {cfg.categoryTabs && (
            <Tabs
              tabs={CATEGORY_TABS}
              activeKey={category}
              onChange={setCategory}
            />
          )}

          <div className="flex flex-col gap-(--sp-3)">
            <p className="font-ui font-(--weight-semibold) [color:var(--text-tertiary)] text-micro/micro uppercase tracking-[0.04em]">
              {cfg.sectionLabel}
            </p>

            {loading ? (
              <>
                <div className="kit-skeleton h-[56px] rounded-lg" />
                <div className="kit-skeleton h-[56px] rounded-lg" />
                <div className="kit-skeleton h-[56px] rounded-lg" />
              </>
            ) : visibleProducts.length === 0 ? (
              <EmptyState
                variant="filtered"
                title="No matches"
                description="No products match your search in this flow."
              />
            ) : (
              visibleProducts.map((p) => {
                const line = lineByProduct.get(p.id);
                const onHand = availableById.get(p.id) ?? 0;
                // ── KIT GAP (flagged to orchestrator) ─────────────────
                // SelectableProductRow hard-wires `blocked = quantity >
                // available` and `available === 0 ⇒ row inert`, with no
                // additive mode. The two additive flows (Receive,
                // Production — flow doc §"Cross-cutting" rule 3) must NOT
                // block on over-on-hand, and Production must allow
                // selecting a 0-stock (never-produced) dish.
                //
                // Interim (no kit change): additive flows pass
                // `max(onHand, thisLineQty)` as `available`, so the kit
                // never paints the §9.8 block and never treats the row as
                // inert, while the readout still shows the true on-hand
                // for every realistic entry (qty ≤ on-hand). Spend flows
                // pass the real balance and use the kit block as drawn.
                // `handleBlockedChange` also no-ops for additive flows.
                // A kit `additive` / `neverBlocks` prop removes all of it.
                const lineQty = line?.quantity ?? 0;
                const rowAvailable = cfg.spend
                  ? onHand
                  : Math.max(onHand, lineQty, 1);
                return (
                  <SelectableProductRow
                    key={p.id}
                    productId={p.id}
                    name={p.name}
                    unit={p.unitLabel}
                    available={rowAvailable}
                    selected={line != null}
                    quantity={lineQty}
                    onSelect={select}
                    onDeselect={deselect}
                    onQuantityChange={setQuantity}
                    onBlockedChange={handleBlockedChange}
                    availableLabelPrefix={cfg.availPrefix}
                  />
                );
              })
            )}
          </div>

          {/* Per-flow secondary fields */}
          {isTransferLike && (
            <Select
              label="Destination"
              required
              placeholder="Send to…"
              options={data.locations
                .filter((l) => l.id !== sourceLocationId)
                .map((l) => ({ value: l.id, label: l.name }))}
              value={destId}
              onChange={setDestId}
              error={touched && destId === ""}
              helperText={
                touched && destId === "" ? "Pick a destination." : undefined
              }
              className="w-full"
            />
          )}
          {mode === "non-sale" && (
            <>
              <Select
                label="Consumption reason"
                required
                placeholder="Why is this stock leaving?"
                options={NON_SALE_REASONS}
                value={reason}
                onChange={(v) => setReason(v as NonSaleReason)}
                error={touched && reason === ""}
                helperText={
                  touched && reason === "" ? "Pick a reason." : undefined
                }
                className="w-full"
              />
              <Textarea
                label={noteRequired ? "Note (required)" : "Note (optional)"}
                required={noteRequired}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                // The sticky submit is disabled while the note is missing
                // (§9.8), so surface the requirement as soon as reason
                // "other" is picked, not only on a submit attempt.
                error={noteRequired && !noteValid}
                helperText={
                  noteRequired && !noteValid
                    ? "A note is required for 'Other'."
                    : undefined
                }
                className="w-full"
              />
            </>
          )}

          {/* Impact preview — danger-tinted when a line is blocked */}
          {!loading && (hasBlockedLine || hasBlankLine) && lines.length > 0 ? (
            <div
              role="status"
              className="[font-synthesis:none] flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-danger-bg antialiased"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="var(--color-danger)"
                  strokeWidth="1.5"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                  stroke="var(--color-danger)"
                  strokeWidth="1.5"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                  stroke="var(--color-danger)"
                  strokeWidth="1.5"
                />
              </svg>
              <div className="font-ui inline-block text-danger text-sm/sm">
                {hasBlockedLine
                  ? `${blockedIds.size} ${
                      blockedIds.size === 1 ? "line is" : "lines are"
                    } over available stock. Fix it to continue.`
                  : `${lines.filter((l) => !(l.quantity > 0)).length} ${
                      lines.filter((l) => !(l.quantity > 0)).length === 1
                        ? "line needs"
                        : "lines need"
                    } a quantity. Fix it to continue.`}
              </div>
            </div>
          ) : (
            !loading &&
            selectedLines.length > 0 && (
              <CalculatedImpactBanner>
                {impactCopy(
                  mode,
                  selectedLines.length,
                  batchTotal,
                  batchUnit,
                  destName(),
                  sourceLabel,
                )}
              </CalculatedImpactBanner>
            )
          )}
        </>
      )}
    </FlowScaffold>
  );
}

// ── Copy helpers ──────────────────────────────────────────────────────

function nProducts(mode: MovementMode, n: number): string {
  if (mode === "issue") return `${n} ${n === 1 ? "ingredient" : "ingredients"}`;
  if (mode === "production") return `${n} ${n === 1 ? "dish" : "dishes"}`;
  return `${n} ${n === 1 ? "product" : "products"}`;
}

function impactCopy(
  mode: MovementMode,
  n: number,
  total: number,
  unit: string,
  dest: string,
  source: string,
): string {
  const t = `${formatQty(total)} ${unit}`;
  switch (mode) {
    case "receive":
      return `Adds ${t} across ${nProducts(mode, n)} to Store stock now.`;
    case "issue":
      return `Removes ${t} across ${nProducts(
        mode,
        n,
      )} from Store stock now, and adds it to Kitchen.`;
    case "production":
      return `Adds ${t} across ${nProducts(mode, n)} to Restaurant stock now.`;
    case "transfer":
    case "dispatch":
      return `Removes ${t} from ${source} now; lands at ${
        dest || "the destination"
      } once they accept.`;
    case "non-sale":
      return `Removes ${t} from Store as staff meals / spoilage. This is not a sale.`;
  }
}

function successToast(
  mode: MovementMode,
  n: number,
  total: number,
  unit: string,
  dest: string,
): string {
  const t = `${formatQty(total)} ${unit}`;
  switch (mode) {
    case "receive":
      return `Received · ${nProducts(mode, n)} · +${t}`;
    case "issue":
      return `Issued · ${nProducts(mode, n)} · ${t} to Kitchen`;
    case "production":
      return `Logged · ${nProducts(mode, n)} · +${t} to Restaurant`;
    case "transfer":
    case "dispatch":
      return `Dispatched · ${nProducts(mode, n)} · awaiting ${
        dest || "destination"
      } accept`;
    case "non-sale":
      return `Logged · ${nProducts(mode, n)} · −${t} non-sale`;
  }
}
