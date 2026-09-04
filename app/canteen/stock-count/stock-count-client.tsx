"use client";

// K1 — Canteen Stock Count screen (mobile — 390px viewport).
//
// Two sub-screens compose into one client component, toggled by local state:
//
//   [picker]   → "Stock Count" header + back arrow
//               Search input + category tabs (All / Drinks / Snacks / …)
//               Product list — each row: name + category + "Select" button
//               "Confirm count" footer (disabled, greyed)
//
//   [counting] → Same header
//               Selected product block (name · category · unit · "Change" link)
//               "Counted remaining" label + QuantityStepper + unit label
//               CalculatedImpactBanner (preview: sold, revenue, closing stock)
//               "Confirm count" footer (active once qty ≥ 0 and product selected)
//
// G4 (approved): after a successful count, the screen checks whether a
//   same-day count already exists for the product by calling the list endpoint
//   with ?productId=&date=today. If one exists, the hub navigates back and
//   shows a toast. Void (delete today's count) is surfaced on the hub — not
//   here — to keep K1 a single-action screen.
//
// Paper artboard references: H6V-0 (picker), H8J-0 (count with preview).
// Kit components: QuantityStepper, CalculatedImpactBanner, SearchInput.
// No new kit components. Spacing / sizing from design system tokens.

import * as React from "react";
import { useRouter } from "next/navigation";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/kit/button";
import { useToast } from "@/components/kit/toast";
import { ErrorState } from "@/components/kit/error-state";
import {
  useStockCountActions,
  useStockCountPreview,
  StockCountRequestError,
  type StockCountPreview,
} from "../use-stock-count";
import { useCanteenProducts, type CanteenProduct } from "../use-canteen-products";

// ── Display helpers ────────────────────────────────────────────────────

function fmtMoney(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return `KES ${amount}`;
  return `KES ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** "12" ← "12.0000"; keeps real fractions ("12.5" ← "12.5000"). */
function trimQty(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

function fmtCountedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

// ── K1 main component ──────────────────────────────────────────────────

type Screen = "picker" | "counting";

export function StockCountClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, loading: productsLoading, error: productsError } =
    useCanteenProducts();
  const { recordStockCount } = useStockCountActions();

  const [screen, setScreen] = React.useState<Screen>("picker");
  const [selected, setSelected] = React.useState<CanteenProduct | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  // F7-2: the real derived sold / revenue for the counted value, straight
  // from the shared `deriveStockCount` calc — the exact figures the commit
  // will persist. Debounced; re-runs on every counted-value change.
  const { preview, loading: previewLoading } = useStockCountPreview(
    selected?.id ?? null,
    String(qty),
  );

  // Categories from the canteen products list.
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

  function selectProduct(p: CanteenProduct) {
    setSelected(p);
    setQty(0);
    setScreen("counting");
  }

  function goBack() {
    if (screen === "counting") {
      setScreen("picker");
      setSelected(null);
      setQty(0);
    } else {
      router.back();
    }
  }

  async function confirmCount() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await recordStockCount({
        productId: selected.id,
        countedQuantity: String(qty),
      });
      toast(
        `Stock count recorded for ${selected.name}`,
        { tone: "success" },
      );
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof StockCountRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't record the count.";
      toast(msg, { tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  // Block Confirm when the derivation says the count exceeds expected
  // stock — the server rejects it anyway; disabling here matches the
  // flow-doc "blocked" state (walkthrough C).
  const blocked = preview?.blocked === true;
  const canConfirm = selected !== null && !submitting && !blocked;

  return (
    // Fill the staff shell's scroll region — NOT `min-h-screen`. The shell
    // (components/shells/staff-shell.tsx) is already `h-screen` with a
    // fixed header + bottom nav; a `min-h-screen` child overflows that and
    // pushes the sticky "Confirm count" footer below the visible viewport
    // (Session 16 finding — same failure the FlowScaffold header comment
    // documents). `grow min-h-0` + an inner `overflow-y-auto` body +
    // `shrink-0` footer keeps Confirm pinned and always visible.
    <div className="flex flex-col grow min-h-0 bg-(--surface-page)">
      {/* Header — matches Paper: back arrow + "Stock Count" title */}
      <div className="flex items-center h-(--control-xl) px-(--sp-6) gap-(--sp-4) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          className="kit-focus-ring rounded-sm"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <line
              x1="19" y1="12" x2="5" y2="12"
              stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"
            />
            <polyline
              points="12 19 5 12 12 5"
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/body">
          Stock Count
        </h1>
      </div>

      {/* Body — switches between picker and counting. The only scroll
          region; `min-h-0` lets it actually shrink so the footer stays put. */}
      <div className="flex flex-col grow min-h-0 overflow-y-auto">
        {screen === "picker" ? (
          <PickerScreen
            products={filtered}
            categories={categories}
            activeCategory={activeCategory}
            query={query}
            loading={productsLoading}
            error={productsError}
            onQueryChange={setQuery}
            onCategoryChange={setActiveCategory}
            onSelect={selectProduct}
          />
        ) : selected ? (
          <CountingScreen
            product={selected}
            qty={qty}
            onQtyChange={setQty}
            onChangeProduct={() => {
              setScreen("picker");
              setSelected(null);
              setQty(0);
            }}
            preview={preview}
            previewLoading={previewLoading}
          />
        ) : null}
      </div>

      {/* Sticky footer — "Confirm count". Same chrome as every other staff
          flow's submit bar (flow-scaffold.tsx): shrink-0, --sp-6/--sp-4
          padding, a full-width size="lg" primary. */}
      <div className="flex items-center shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button
          id="k1-confirm-count"
          variant="primary"
          size="lg"
          disabled={!canConfirm}
          loading={submitting}
          onClick={confirmCount}
          className="w-full"
        >
          Confirm count
        </Button>
      </div>
    </div>
  );
}

// ── Picker sub-screen ─────────────────────────────────────────────────
// Matches Paper H6V-0: search input → category tabs → product list

function PickerScreen({
  products,
  categories,
  activeCategory,
  query,
  loading,
  error,
  onQueryChange,
  onCategoryChange,
  onSelect,
}: {
  products: CanteenProduct[];
  categories: string[];
  activeCategory: string | null;
  query: string;
  loading: boolean;
  error: string | null;
  onQueryChange: (q: string) => void;
  onCategoryChange: (c: string | null) => void;
  onSelect: (p: CanteenProduct) => void;
}) {
  if (error) {
    return (
      <div className="flex flex-col p-(--sp-6)">
        <ErrorState
          title="Couldn't load products"
          description={error}
        />
      </div>
    );
  }

  return (
    <>
      {/* Search input — matches Paper's search-looking input row */}
      <div className="mx-(--sp-6) mt-(--sp-5) mb-(--sp-5)">
        <SearchInput
          id="k1-product-search"
          placeholder="Search canteen products"
          value={query}
          onChange={(val) => onQueryChange(val)}
          onClear={() => onQueryChange("")}
        />
      </div>

      {/* Category tabs — matches Paper: All · Drinks · Snacks · Bakery … */}
      <div className="flex px-(--sp-6) gap-(--sp-7) border-b border-b-solid [border-bottom-color:var(--border-subtle)] overflow-x-auto shrink-0">
        <CategoryTab
          label="All"
          active={activeCategory === null}
          onClick={() => onCategoryChange(null)}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() => onCategoryChange(cat)}
          />
        ))}
      </div>

      {/* Product list */}
      <div className="flex flex-col grow basis-0 overflow-auto">
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="kit-skeleton h-[14px] w-[120px]" />
              <div className="kit-skeleton h-[28px] w-[64px]" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] font-ui [color:var(--text-tertiary)] text-sm/sm px-(--sp-6) text-center">
            {query ? "No products match your search." : "No canteen products found."}
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="flex flex-col gap-px min-w-0">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                  {p.name}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {[p.category, p.unitLabel].filter(Boolean).join(" · ")}
                </span>
              </div>
              <button
                type="button"
                id={`k1-select-${p.id}`}
                onClick={() => onSelect(p)}
                className="flex items-center h-(--control-sm) px-(--sp-4) rounded-sm border border-solid [border-color:var(--border-strong)] font-ui font-(--weight-medium) [color:var(--text-primary)] text-caption/micro kit-interactive kit-focus-ring shrink-0"
              >
                Select
              </button>
            </div>
          ))
        )}
      </div>
    </>
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
        <span className="font-ui font-(--weight-semibold) text-accent text-sm/sm">
          {label}
        </span>
      ) : (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {label}
        </span>
      )}
    </button>
  );
}

// ── Counting sub-screen ───────────────────────────────────────────────
// Matches Paper H8J-0: product header + QuantityStepper + preview banner.
// The preview card (F7-2) shows the REAL derived sold / revenue for the
// counted value — the same figures the commit will persist — via
// `GET /api/canteen/stock-counts/preview` (`useStockCountPreview`).

function previewText(
  preview: StockCountPreview | null,
  previewLoading: boolean,
  unit: string,
): string {
  if (!preview) {
    return previewLoading
      ? "Working out sales for this count…"
      : "Enter the counted quantity to see units sold and revenue.";
  }

  const closing = `${trimQty(preview.closingStockWillBe)} ${unit}`;

  if (preview.blocked) {
    return (
      `Counted more than expected — the shelf has ${trimQty(
        preview.exceedsExpectedBy ?? "0",
      )} ${unit} more than the ledger accounts for. ` +
      "A delivery or transfer into the canteen may not have been recorded. " +
      "Ask the Store Manager to log it, then recount — the count can't be saved until the numbers line up."
    );
  }

  const sold = `${trimQty(preview.unitsSold ?? "0")} ${unit}`;
  const revenue = fmtMoney(preview.revenue ?? "0");

  if (preview.isFirstCount) {
    return (
      `First count for this product. Everything since its opening stock: ` +
      `sold ${sold}. Revenue ${revenue}. Closing stock will be set to ${closing}.`
    );
  }

  const since = preview.lastCountedAt
    ? `since last count on ${fmtCountedDate(preview.lastCountedAt)}`
    : "since the last count";
  const days =
    preview.daysSincePrevious != null && preview.daysSincePrevious > 0
      ? ` (${preview.daysSincePrevious} ${
          preview.daysSincePrevious === 1 ? "day" : "days"
        })`
      : "";

  return (
    `Since ${since}${days}: sold ${sold}. Revenue ${revenue}. ` +
    `Closing stock will be set to ${closing}.`
  );
}

function CountingScreen({
  product,
  qty,
  onQtyChange,
  onChangeProduct,
  preview,
  previewLoading,
}: {
  product: CanteenProduct;
  qty: number;
  onQtyChange: (v: number) => void;
  onChangeProduct: () => void;
  preview: StockCountPreview | null;
  previewLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
      {/* Selected product block */}
      <div className="flex items-start justify-between border-b border-b-solid [border-bottom-color:var(--border-subtle)] pb-(--sp-5)">
        <div className="flex flex-col gap-px min-w-0">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/body">
            {product.name}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {[product.category, product.unitLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
        <button
          type="button"
          id="k1-change-product"
          onClick={onChangeProduct}
          className="font-ui font-(--weight-medium) text-accent text-sm/sm shrink-0 ml-(--sp-4) kit-focus-ring rounded-sm"
        >
          Change
        </button>
      </div>

      {/* Quantity input */}
      <div className="flex flex-col gap-(--sp-4)">
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          Counted remaining
        </span>
        <div className="flex items-center gap-(--sp-4)">
          <QuantityStepper
            value={qty}
            min={0}
            step={1}
            onChange={onQtyChange}
            format={(v) => String(v)}
          />
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {product.unitLabel}
          </span>
        </div>
      </div>

      {/* Calculated impact preview — real derived sold / revenue (F7-2).
          The full 9-state K1 rebuild (inline §9.8 error + InstructionalBanner
          for the blocked case) is Batch 3d; here the preview text carries the
          "counted more than expected" explanation and Confirm is disabled. */}
      <div data-testid="k1-preview">
        <CalculatedImpactBanner>
          {previewText(preview, previewLoading, product.unitLabel)}
        </CalculatedImpactBanner>
      </div>
    </div>
  );
}
