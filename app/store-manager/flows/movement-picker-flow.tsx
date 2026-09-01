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
  useOutstandingDeliveries,
  stockApi,
  StockRequestError,
  type BatchLine,
} from "../use-staff-stock";
import { trimQty } from "../staff-stock-format";
import { FlowScaffold } from "./flow-scaffold";

export type MovementMode =
  | "receive"
  | "issue"
  | "production"
  | "transfer"
  | "non-sale";

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
  /** Which products the picker lists. */
  productKinds: "non-dish" | "dish" | "all";
  searchPlaceholder: string;
  sectionLabel: string;
  /** `SelectableProductRow.availableLabelPrefix`. The kit only supports a
   * prefix, so Production's flow-doc suffix ("N in Rest.") ships as the
   * prefix "In Rest.:" — cosmetic delta, logged for QA. */
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
    availPrefix: "In Rest.:",
    spend: false,
    categoryTabs: false,
    emptyTitle: "No dishes set up",
    emptyDescription: "Add dishes in the Catalog before logging production.",
    errorTitle: "Couldn't load dishes",
  },
  transfer: {
    title: "Transfer Stock",
    direction: "Store → …",
    tone: "info",
    productKinds: "non-dish",
    searchPlaceholder: "Search sodas, goods, stock…",
    sectionLabel: "Select items to transfer",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: true,
    emptyTitle: "Nothing to transfer",
    emptyDescription: "The Store has no stock to send right now.",
    errorTitle: "Couldn't load Store stock",
  },
  "non-sale": {
    title: "Log Non-Sale",
    direction: "Staff meals & spoilage",
    tone: "warning",
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
  const { data, loading, error, refresh } = useStaffStock();

  // The SM's own location, resolved from the flow's location scope.
  const storeLocationId =
    data.locations.find((l) => l.type === "store")?.id ?? "";
  const restaurantLocationId =
    data.locations.find((l) => l.type === "restaurant")?.id ?? "";
  // The location whose derived balances feed the row `available` readouts:
  // Production reads the Restaurant (the dish's landing stock); every
  // other flow reads the Store.
  const balanceLocationId =
    mode === "production" ? restaurantLocationId : storeLocationId;

  const { rows: levelRows } = useStockLevels(balanceLocationId || undefined);
  const availableById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of levelRows) m.set(r.productId, Number.parseFloat(r.quantity));
    return m;
  }, [levelRows]);

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
      data.products.filter((p) =>
        cfg.productKinds === "dish"
          ? p.kind === "dish"
          : cfg.productKinds === "non-dish"
            ? p.kind !== "dish"
            : true,
      ),
    [data.products, cfg.productKinds],
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
  const secondaryValid =
    mode === "transfer"
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
  // flows (Issue / Transfer / Non-sale) remove → `−`.
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
      } else if (mode === "transfer") {
        written = await stockApi.transferBatch({
          fromLocationId: storeLocationId,
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
      router.push("/store-manager");
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

  // ── Direction badge (Transfer tracks the destination) ───────────────
  const direction =
    mode === "transfer" ? `Store → ${destName() || "…"}` : cfg.direction;

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
                // selecting a 0-stock (never-produced) dish. Interim
                // (no kit change): additive flows pass the REAL on-hand
                // as `available` when it is > 0 (so the readout is
                // correct), and `Infinity` when it is 0 (so a fresh dish
                // is still selectable). `handleBlockedChange` then
                // ignores non-spend flows, so an over-on-hand additive
                // line never disables submit. Spend flows use the real
                // balance and the kit's §9.8 block exactly as drawn.
                // A kit `additive` / `neverBlocks` prop would remove this.
                const rowAvailable = cfg.spend
                  ? onHand
                  : onHand > 0
                    ? onHand
                    : Infinity;
                return (
                  <SelectableProductRow
                    key={p.id}
                    productId={p.id}
                    name={p.name}
                    unit={p.unitLabel}
                    available={rowAvailable}
                    selected={line != null}
                    quantity={line?.quantity ?? 0}
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
          {mode === "transfer" && (
            <Select
              label="Destination"
              required
              placeholder="Send to…"
              options={data.locations
                .filter((l) => l.id !== storeLocationId)
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
                {impactCopy(mode, selectedLines.length, batchTotal, batchUnit, destName())}
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
      return `Removes ${t} from Store now; lands at ${
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
      return `Dispatched · ${nProducts(mode, n)} · awaiting ${
        dest || "destination"
      } accept`;
    case "non-sale":
      return `Logged · ${nProducts(mode, n)} · −${t} non-sale`;
  }
}
