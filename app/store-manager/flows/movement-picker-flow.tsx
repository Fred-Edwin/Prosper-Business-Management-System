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
import { Button } from "@/components/kit/button";
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
import { useCanteenProducts } from "@/app/canteen/use-canteen-products";
import { FlowScaffold } from "./flow-scaffold";

export type MovementMode =
  | "receive"
  | "issue"
  | "production"
  | "transfer"
  | "non-sale"
  // M2-3d: the Canteen Transfer Dispatch flow. Behaves exactly like
  // `transfer` (multi-row picker, category tabs, an auto-resolved
  // destination per ADR-67, the two-phase-transfer rule, POST
  // …/transfers/batch) but the SOURCE is the Canteen: balances, the batch
  // `fromLocationId` and the "Canteen → {dest}" badge all read the
  // Canteen. Role: Canteen Attendant (+ Admin). On success → `/canteen`.
  | "dispatch"
  // Session 16: the Canteen non-sale / waste flow. Behaves exactly like
  // `non-sale` (multi-row picker, reason <Select> + note <Textarea>, POST
  // …/non-sale/batch) but the SOURCE is the Canteen: balances, the batch
  // `locationId` and the copy all read the Canteen, and the picker is
  // scoped to the canteen-sellable set (GET /api/canteen/products) rather
  // than the whole catalogue. PRD §3 ("recorded by: any staff") + ADR-67
  // (non_sale_consumption is legal outbound at the canteen). Role: Canteen
  // Attendant (+ Admin). On success → `/canteen`.
  | "canteen-non-sale"
  // Session 16: the Restaurant non-sale / waste flow — the Cashier's
  // equivalent. Same as `canteen-non-sale` but the SOURCE is the
  // Restaurant. The Restaurant holds dishes + goods (ADR-67); the picker
  // lists off the shared catalogue filtered to dish-or-goods (no
  // /api/canteen/products equivalent for the Restaurant). Role: Cashier
  // (+ Admin). On success → `/cashier`.
  | "restaurant-non-sale"
  // Session 16 / ADR-69: the Canteen "Receive Goods" flow. Behaves like
  // `receive` (the "Deliveries awaiting receipt" <MatchCard> list, the
  // additive picker, POST …/receipts/batch) but the destination is the
  // CANTEEN and there is no kind split: the Canteen only ever holds
  // dish/goods, so the whole batch posts at one location. Exists because
  // receiving is by destination, not by the receiver's home location —
  // a Canteen-destined purchase used to be a dead end (no role could see
  // or receive it). Goods still ALSO reach the Canteen by transfer from
  // the Restaurant (ADR-67), unchanged. Role: Canteen Attendant (+ Admin).
  // On success → `/canteen`.
  | "canteen-receive";

/**
 * Which single location a flow's stock leaves from.
 *   - `dispatch` (Canteen Attendant): the Canteen.
 *   - `transfer` (Store Manager): the Restaurant. Under the location↔kind
 *     model (ADR-67) both dishes AND goods live at the Restaurant — goods
 *     are received there now, not into the Store — so the SM transfer is a
 *     plain single-source Restaurant → Canteen dispatch. (It used to be
 *     per-product multi-source: dishes from the Restaurant, goods from the
 *     Store. That split is gone with the model change.)
 *   - every other SM flow: the Store.
 */
// (`canteen-receive` is Canteen-*destined* rather than Canteen-sourced,
// but the single location it reads balances from and posts at is the
// Canteen either way — so it rides the same resolution.)
const CANTEEN_SOURCED = new Set<MovementMode>([
  "dispatch",
  "canteen-non-sale",
  "canteen-receive",
]);
const RESTAURANT_SOURCED = new Set<MovementMode>([
  "transfer",
  "restaurant-non-sale",
]);

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
    // ADR-67: ingredient deliveries land at the Store, goods deliveries at
    // the Restaurant (goods can't sit at the Store). One flow, the batch
    // splits by kind on submit.
    direction: "Supplier → Store / Restaurant",
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
    errorTitle: "Couldn't load stock",
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
    direction: "Restaurant → …",
    tone: "info",
    // The SM sends sellable output from the Restaurant to the Canteen —
    // cooked dishes + shop goods (sodas, snacks, packaged items), never
    // raw ingredients. Single-source: everything leaves the Restaurant,
    // where both production lands dishes and deliveries land goods
    // (ADR-67). The destination is auto-resolved (see validDestinations).
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
  "canteen-non-sale": {
    title: "Log Non-Sale",
    direction: "Staff meals & spoilage",
    tone: "warning",
    // The Canteen holds dishes + goods (ADR-67) — the canteen-sellable
    // set, from GET /api/canteen/products, same scope as `dispatch`.
    // Ingredients never live here, so "all" would just be that same set.
    productKinds: "canteen",
    searchPlaceholder: "Search items to log…",
    sectionLabel: "Select items to log",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: false,
    emptyTitle: "Nothing to log",
    emptyDescription: "The Canteen has no stock on hand to write off.",
    errorTitle: "Couldn't load Canteen stock",
  },
  "canteen-receive": {
    title: "Receive Goods",
    // ADR-69: a goods delivery destined for the Canteen lands there
    // directly — no Store hop (goods may not sit at the Store, ADR-67)
    // and no transfer required.
    direction: "Supplier → Canteen",
    tone: "success",
    // The Canteen holds dish/goods only, and only what it actually sells
    // — the canteen-sellable set from GET /api/canteen/products, same
    // scope as `dispatch` / `canteen-non-sale`.
    productKinds: "canteen",
    searchPlaceholder: "Search products…",
    sectionLabel: "Products delivered",
    availPrefix: "On hand:",
    spend: false,
    categoryTabs: false,
    emptyTitle: "No products set up",
    emptyDescription:
      "Nothing is sold at the Canteen yet — add it in the Catalog before recording a delivery.",
    errorTitle: "Couldn't load Canteen stock",
  },
  "restaurant-non-sale": {
    title: "Log Non-Sale",
    direction: "Staff meals & spoilage",
    tone: "warning",
    // The Restaurant holds dishes + goods (ADR-67), never ingredients —
    // dish-or-goods, off the shared catalogue (no canteen-products
    // equivalent for the Restaurant).
    productKinds: "dish-or-goods",
    searchPlaceholder: "Search items to log…",
    sectionLabel: "Select items to log",
    availPrefix: "Avail:",
    spend: true,
    categoryTabs: false,
    emptyTitle: "Nothing to log",
    emptyDescription: "The Restaurant has no stock on hand to write off.",
    errorTitle: "Couldn't load Restaurant stock",
  },
};

// The Transfer category tab row (flow doc §"Body composition" item 3).
const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "Beverages & Soda", label: "Beverages & Soda" },
  { key: "Shop Goods", label: "Shop Goods" },
];

// ── Additive-flow row (screen-local, no kit change) ───────────────────
//
// `SelectableProductRow` is drawn for the SPEND flows: `available` is the
// balance you may draw down, `quantity > available` paints the §9.8 BLOCK,
// and `available === 0` makes the whole row inert ("None on hand", `+
// Select` disabled). All correct for Issue / Transfer / Non-sale.
//
// The additive flows (Receive, Production) invert that: you are ADDING to
// the balance, so on-hand is a readout, never a ceiling, and a 0-stock
// product must stay selectable — receiving the first-ever delivery of a
// product, or producing a dish that has never been produced, are the
// normal cases, not error states.
//
// The previous interim passed `Math.max(onHand, lineQty, 1)` as
// `available` to dodge both kit behaviours. That worked, but the `, 1`
// floor FABRICATED stock: a product with a true balance of 0 read
// "On hand: 1" — which is how the inactive-Restaurant bug presented as a
// screen of fake `1`s (m2-followups #16), and what the owner hit on
// Carrots at the Store on the 2026-09-02 walkthrough.
//
// So: pass the TRUE `onHand` to every readout and never fake it. The kit
// computes `blocked = selected && quantity > available` internally
// (selectable-product-row.tsx) — `max` lifts only the stepper `+`
// ceiling and `aria-valuemax`, NOT the block. So the kit's SELECTED
// branch would paint the §9.8 danger treatment + "Only N … on hand —
// reduce or remove this line" the moment an additive quantity exceeds
// on-hand (produce 40 chapati with 30 in stock → false error; Session 16
// step 6). That is wrong for an additive flow: on-hand is a readout, not
// a ceiling.
//
// So this wrapper delegates to the kit ONLY for the states where the kit
// cannot block — the not-selected row (0 or non-zero on-hand) — and
// renders the SELECTED row locally in `AdditiveStepperRow` (same markup
// + the ADR-43 / ADR-48 stepper contract, no ceiling, no block). The
// on-hand-0 not-selected row is also local (the kit mutes it inert,
// wrong when receiving a first-ever delivery / producing a never-made
// dish). `handleBlockedChange` is a no-op for additive flows anyway, so
// submit was never gated — this fix is purely the spurious per-row
// error.
//
// A kit `neverBlocks` / `additive` prop (m2-followups #1) would delete
// this wrapper. Not taken here: it needs owner sign-off and the kit is
// frozen (CONVENTIONS §"never fork the kit").
function AdditiveProductRow({
  productId,
  name,
  unit,
  onHand,
  selected,
  quantity,
  onSelect,
  onDeselect,
  onQuantityChange,
  availableLabelPrefix,
}: {
  productId: string;
  name: string;
  unit: string;
  onHand: number;
  selected: boolean;
  quantity: number;
  onSelect: (productId: string) => void;
  onDeselect: (productId: string) => void;
  onQuantityChange: (productId: string, next: number) => void;
  availableLabelPrefix: string;
}) {
  const availLabel = `${availableLabelPrefix} ${formatQty(onHand)} ${unit}`;

  // NOT SELECTED — the kit cannot block a row it isn't stepping, so
  // delegate the non-zero not-selected row to the kit untouched (honest
  // "Available: N unit" readout, `+ Select`). The on-hand-0 not-selected
  // row is rendered locally: the kit's `available === 0` branch mutes it
  // inert, wrong when this is a first-ever delivery / a never-made dish.
  if (!selected) {
    if (onHand !== 0) {
      return (
        <SelectableProductRow
          productId={productId}
          name={name}
          unit={unit}
          available={onHand}
          selected={false}
          quantity={quantity}
          max={Infinity}
          onSelect={onSelect}
          onDeselect={onDeselect}
          onQuantityChange={onQuantityChange}
          availableLabelPrefix={availableLabelPrefix}
        />
      );
    }
    return (
      <div
        role="group"
        aria-label={`${name}, ${availLabel}`}
        className="[font-synthesis:none] antialiased flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]"
      >
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro">
          {availLabel}
        </span>
        <span className="shrink-0 basis-[108px] flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSelect(productId)}
          >
            + Select
          </Button>
        </span>
      </div>
    );
  }

  // SELECTED — rendered locally for ANY on-hand value. The kit's selected
  // branch computes `blocked = quantity > available` and paints the §9.8
  // danger treatment + "Only N … on hand — reduce or remove this line"
  // when an additive quantity exceeds on-hand — a false error for a flow
  // that ADDS stock (Session 16 step 6). This row keeps the honest
  // on-hand readout, has no ceiling, and never blocks.
  return (
    <AdditiveStepperRow
      productId={productId}
      name={name}
      unit={unit}
      availLabel={availLabel}
      onHand={onHand}
      quantity={quantity}
      onDeselect={onDeselect}
      onQuantityChange={onQuantityChange}
    />
  );
}

/**
 * The SELECTED row for every additive flow (Receive / Production),
 * regardless of on-hand. Mirrors the kit's selected row (tint + accent
 * border + the compact `− [n] +` stepper, ADR-43 / ADR-48 interaction
 * contract: tap-to-type, commit on blur / Enter, ↑ / ↓ step, stepping to
 * 0 deselects) with two additive differences: the readout is the honest
 * on-hand ("Available: 30 pcs") rather than being suppressed, and there
 * is no ceiling — you are ADDING stock, so nothing here is "over
 * available" and the §9.8 block never applies.
 */
function AdditiveStepperRow({
  productId,
  name,
  unit,
  availLabel,
  onHand,
  quantity,
  onDeselect,
  onQuantityChange,
}: {
  productId: string;
  name: string;
  unit: string;
  availLabel: string;
  onHand: number;
  quantity: number;
  onDeselect: (productId: string) => void;
  onQuantityChange: (productId: string, next: number) => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const display = editing ?? formatQty(quantity);

  function commit(raw: string) {
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) {
      setEditing(null);
      return;
    }
    if (n <= 0) onDeselect(productId);
    else onQuantityChange(productId, n);
    setEditing(null);
  }

  function step_(delta: number) {
    const next = quantity + delta;
    if (next <= 0) onDeselect(productId);
    else onQuantityChange(productId, next);
  }

  return (
    <div
      role="group"
      aria-label={`${name}, ${availLabel}, quantity ${formatQty(quantity)} ${unit}`}
      data-selected
      className="[font-synthesis:none] antialiased flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid bg-(--surface-selected) border-accent"
    >
      <div className="flex items-center gap-[8px]">
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-micro/micro">
          {availLabel}
        </span>
        <span className="shrink-0 basis-[108px] flex justify-end">
          <div className="flex items-center h-[32px] rounded-md overflow-clip shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
            <button
              type="button"
              disabled={quantity <= 0}
              onClick={() => step_(-1)}
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
                aria-label={`${name} quantity`}
                aria-valuenow={quantity}
                aria-valuemin={0}
                aria-valuetext={`${formatQty(quantity)} ${unit}`}
                value={display}
                onChange={(e) => setEditing(e.target.value)}
                onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    step_(1);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    step_(-1);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    commit((e.target as HTMLInputElement).value);
                  }
                }}
                className="w-max min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-medium) [font-feature-settings:'tnum'] text-sm/micro [color:var(--text-primary)]"
                style={{ width: `${Math.max(display.length, 2)}ch` }}
              />
            </span>
            <button
              type="button"
              onClick={() => step_(1)}
              aria-label="Increase"
              tabIndex={-1}
              className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
            >
              +
            </button>
          </div>
        </span>
      </div>

      {/* Session 16 (owner) — "during the review, show what's available and
          what's being added". The resulting balance, live as the stepper
          moves, on its own line: the narrow readout slot can't carry it
          without clipping longer product names, and the summary banner is
          too far from the line you're editing. The kit row has no slot for
          this, and the kit is frozen (CONVENTIONS §6) — which is why this
          screen-local row exists. */}
      <ResultingBalanceLine before={onHand} added={quantity} unit={unit} />
    </div>
  );
}

/**
 * "60 → 72" — the before/after balance for one additive line. Shared by
 * the picker's additive row and the Canteen's Receive-Transfer row so the
 * three additive review screens read identically.
 */
export function ResultingBalanceLine({
  before,
  added,
  unit,
}: {
  before: number;
  added: number;
  unit: string;
}) {
  const after = before + added;
  return (
    <p
      className="font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro"
      // One readable string for AT, rather than the arrow glyph.
      aria-label={`${formatQty(before)} ${unit} on hand, ${formatQty(
        after,
      )} ${unit} after this`}
    >
      {formatQty(before)} → <span className="text-accent">{formatQty(after)}</span>{" "}
      {unit}
    </p>
  );
}

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
  // The SOURCE location — every flow here is single-source: the Canteen
  // for Dispatch, the Restaurant for the SM Transfer (ADR-67), the Store
  // for every other SM flow. Feeds the batch `fromLocationId`, the
  // destination exclusion, and the badge.
  const sourceLocationId = CANTEEN_SOURCED.has(mode)
    ? canteenLocationId
    : RESTAURANT_SOURCED.has(mode)
      ? restaurantLocationId
      : storeLocationId;
  const sourceLabel = CANTEEN_SOURCED.has(mode)
    ? "Canteen"
    : RESTAURANT_SOURCED.has(mode)
      ? "Restaurant"
      : "Store";
  // The location whose derived balances feed the row `available` readouts:
  // Production reads the Restaurant (the dish's landing stock); every
  // other flow reads its own source.
  const balanceLocationId =
    mode === "production" ? restaurantLocationId : sourceLocationId;

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

  // Every flow reads its row `available` from this hook, at its source
  // (or the Restaurant, for Production).
  const stockLevels = useStockLevels(balanceLocationId || undefined);
  const levelRows = stockLevels.rows;

  // Bug #15 (Session 16): the SM `receive` flow is inherently
  // TWO-destination — ADR-67 lands ingredient deliveries at the Store and
  // goods deliveries at the Restaurant, and `onSubmit` already kind-splits
  // into two batches. A single-location balance read (the Store) makes
  // every goods row read "On hand: 0". So for `receive` only, also read
  // the Restaurant's balances and pick each row's on-hand by the product's
  // `kind` — the exact mirror of the submit-time split. No API change:
  // `useStockLevels` stays single-location; we just call it twice.
  // `useStockLevels(undefined)` is a no-op, so every other mode pays
  // nothing. `canteen-receive` is one-destination (the Canteen) and rides
  // the single `stockLevels` read above, unchanged.
  const receiveRestaurantLevels = useStockLevels(
    mode === "receive" ? restaurantLocationId || undefined : undefined,
  );

  // The balance read is not optional chrome — it IS the row readout. A
  // slow or failed GET /api/stock-movements/balances used to settle into a
  // screen of honest-looking zeros; fold it into the screen's loading /
  // error the same way `transferLevels` / `canteen` already are, so it
  // shows skeletons then <ErrorState> instead.
  const balanceLoading = stockLevels.loading || receiveRestaurantLevels.loading;
  const balanceError = stockLevels.error ?? receiveRestaurantLevels.error;

  const loading = stockLoading || canteenLoading || balanceLoading;
  const error =
    stockError ?? (isCanteenScoped ? canteen.error : null) ?? balanceError;
  const availableById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of levelRows) {
      m.set(r.productId, Number.parseFloat(r.quantity));
    }
    return m;
  }, [levelRows]);
  // Bug #15: goods rows on the SM `receive` flow read their on-hand at the
  // Restaurant (where they'll land), not the Store. Empty for every other
  // mode.
  const receiveRestaurantById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of receiveRestaurantLevels.rows) {
      m.set(r.productId, Number.parseFloat(r.quantity));
    }
    return m;
  }, [receiveRestaurantLevels.rows]);
  const onHandFor = React.useCallback(
    (productId: string, kind: string | undefined): number => {
      if (mode === "receive" && kind === "goods") {
        return receiveRestaurantById.get(productId) ?? 0;
      }
      return availableById.get(productId) ?? 0;
    },
    [mode, availableById, receiveRestaurantById],
  );

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

  // ── Transfer destination (ADR-67: auto-resolved, not chosen) ─────────
  //
  // A transfer moves stock between the Restaurant and the Canteen only —
  // never the Store. With exactly one Restaurant and one Canteen (the real
  // world today) the destination is whichever of the two the source
  // isn't, so there is nothing to pick: drop the <Select>, auto-set
  // `destId`, and let the direction badge ("Restaurant → Canteen") show
  // where it's going. The <Select> is kept only for the (currently
  // impossible) case of 2+ valid destinations.
  const isTransferLike = mode === "transfer" || mode === "dispatch";
  const validDestinations = React.useMemo(
    () =>
      isTransferLike
        ? data.locations.filter(
            (l) => l.id !== sourceLocationId && l.type !== "store",
          )
        : [],
    [isTransferLike, data.locations, sourceLocationId],
  );
  const autoDestId =
    validDestinations.length === 1 ? validDestinations[0].id : "";
  React.useEffect(() => {
    if (autoDestId && destId !== autoDestId) setDestId(autoDestId);
  }, [autoDestId, destId]);

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
  // Both delivery-receiving flows share the "Deliveries awaiting receipt"
  // <MatchCard> list and the …/receipts/batch endpoint; they differ only
  // in destination (ADR-69: SM → Store + Restaurant with a kind split,
  // Canteen Attendant → the Canteen, one batch).
  const isReceive = mode === "receive" || mode === "canteen-receive";
  // All non-sale flows (SM at the Store, Canteen Attendant at the Canteen,
  // Cashier at the Restaurant) share the reason <Select> + note <Textarea>
  // and the same …/non-sale/batch endpoint — they differ only in source
  // location and product scope (handled by CANTEEN_SOURCED /
  // RESTAURANT_SOURCED / FLOW_CONFIG).
  const isNonSale =
    mode === "non-sale" ||
    mode === "canteen-non-sale" ||
    mode === "restaurant-non-sale";
  const noteRequired = isNonSale && reason === "other";
  const noteValid = !noteRequired || note.trim() !== "";
  // A transfer needs a resolved destination — normally auto-set, so this
  // is only ever unmet when no valid destination exists (no Canteen, or
  // no Restaurant).
  const secondaryValid = isTransferLike
    ? destId !== ""
    : isNonSale
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
  // Both receive flows are additive (Receive / Canteen Receive), as is
  // Production — they add to a ledger → `+`; the spend flows (Issue /
  // Transfer / Non-sale / Dispatch) remove → `−`.
  const additive = isReceive || mode === "production";
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
    "canteen-non-sale": "Log Non-Sale",
    "restaurant-non-sale": "Log Non-Sale",
    "canteen-receive": "Confirm Receipt",
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
        // ADR-67: split the delivery by kind — ingredient lines land at
        // the Store, goods lines at the Restaurant (goods can't sit at the
        // Store). One `receiptBatch` per target that has lines; the domain
        // R1 guard rejects a mis-targeted line.
        const kindOf = (id: string) =>
          data.products.find((p) => p.id === id)?.kind;
        const toReceiptLine = (l: Line) => ({
          productId: l.productId,
          quantity: formatQty(l.quantity),
          purchasePaymentId: matchedPaymentByProduct.get(l.productId) ?? null,
        });
        const storeLines = selectedLines
          .filter((l) => kindOf(l.productId) === "ingredient")
          .map(toReceiptLine);
        const restaurantLines = selectedLines
          .filter((l) => kindOf(l.productId) === "goods")
          .map(toReceiptLine);
        const batches = await Promise.all([
          storeLines.length > 0
            ? stockApi.receiptBatch({
                locationId: storeLocationId,
                lines: storeLines,
              })
            : Promise.resolve<StockMovementView[]>([]),
          restaurantLines.length > 0
            ? stockApi.receiptBatch({
                locationId: restaurantLocationId,
                lines: restaurantLines,
              })
            : Promise.resolve<StockMovementView[]>([]),
        ]);
        written = batches.flat();
      } else if (mode === "canteen-receive") {
        // ADR-69: a Canteen-destined delivery lands at the Canteen, whole.
        // No kind split — the Canteen only ever holds dish/goods (ADR-67),
        // so every line has the same target.
        written = await stockApi.receiptBatch({
          locationId: canteenLocationId,
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
      } else if (isTransferLike) {
        // Both transfer flows are single-source now (ADR-67): the SM
        // Transfer leaves the Restaurant, the Canteen Dispatch leaves the
        // Canteen. One phase-1 dispatch batch.
        written = await stockApi.transferBatch({
          fromLocationId: sourceLocationId,
          toLocationId: destId,
          lines: plain,
        });
      } else {
        // non-sale / canteen-non-sale — the source is the Store for the SM
        // flow, the Canteen for the attendant flow (sourceLocationId, via
        // CANTEEN_SOURCED).
        written = await stockApi.nonSaleBatch({
          locationId: sourceLocationId,
          reason: reason as NonSaleReason,
          note,
          lines: plain,
        });
      }
      toast(successToast(mode, written.length, batchTotal, batchUnit, destName()), {
        tone: "success",
      });
      router.push(
        mode === "dispatch" ||
          mode === "canteen-non-sale" ||
          mode === "canteen-receive"
          ? "/canteen"
          : mode === "restaurant-non-sale"
            ? "/cashier"
            : "/store-manager",
      );
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
      {isReceive &&
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
                const onHand = onHandFor(p.id, p.kind);
                const lineQty = line?.quantity ?? 0;
                if (!cfg.spend) {
                  return (
                    <AdditiveProductRow
                      key={p.id}
                      productId={p.id}
                      name={p.name}
                      unit={p.unitLabel}
                      onHand={onHand}
                      selected={line != null}
                      quantity={lineQty}
                      onSelect={select}
                      onDeselect={deselect}
                      onQuantityChange={setQuantity}
                      availableLabelPrefix={cfg.availPrefix}
                    />
                  );
                }
                return (
                  <SelectableProductRow
                    key={p.id}
                    productId={p.id}
                    name={p.name}
                    unit={p.unitLabel}
                    available={onHand}
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
          {/* Transfer destination (ADR-67). Auto-resolved when exactly one
              valid target exists (the norm) — the direction badge shows
              it, no picker. A <Select> only appears if a 4th selling
              location is ever added; an empty helper if none exists. */}
          {isTransferLike && validDestinations.length === 0 && (
            <EmptyState
              title="No destination available"
              description="A Restaurant and a Canteen must both exist to transfer stock between them."
            />
          )}
          {isTransferLike && validDestinations.length >= 2 && (
            <Select
              label="Destination"
              required
              placeholder="Send to…"
              options={validDestinations.map((l) => ({
                value: l.id,
                label: l.name,
              }))}
              value={destId}
              onChange={setDestId}
              error={touched && destId === ""}
              helperText={
                touched && destId === "" ? "Pick a destination." : undefined
              }
              className="w-full"
            />
          )}
          {isNonSale && (
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
      // ADR-67: ingredients land at the Store, goods at the Restaurant.
      return `Adds ${t} across ${nProducts(mode, n)} to stock now — ingredients to the Store, goods to the Restaurant.`;
    case "canteen-receive":
      // ADR-69: a Canteen-destined delivery lands at the Canteen, whole.
      return `Adds ${t} across ${nProducts(mode, n)} to Canteen stock now.`;
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
    case "canteen-non-sale":
    case "restaurant-non-sale":
      return `Removes ${t} from ${source} as staff meals / spoilage. This is not a sale.`;
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
    case "canteen-receive":
      return `Received · ${nProducts(mode, n)} · +${t} at Canteen`;
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
    case "canteen-non-sale":
    case "restaurant-non-sale":
      return `Logged · ${nProducts(mode, n)} · −${t} non-sale`;
  }
}
