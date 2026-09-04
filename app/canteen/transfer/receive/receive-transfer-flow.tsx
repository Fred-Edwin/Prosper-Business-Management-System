"use client";

// Canteen — Receive Transfer flow (phase 2 of the 2-phase transfer, ADR-39).
//
// The Canteen Attendant taps the "N items incoming — Review & Receive"
// banner on the hub and lands here: one row per pending inbound dispatch
// line, each with a stepper PRE-FILLED to the dispatched quantity. They
// confirm or adjust what actually arrived, then tap Receive — which calls
// POST /api/stock-movements/:id/accept per line ({ receivedQuantity } when
// a line was changed, no body when it matches). No admin, no flag path.
//
// COMPOSED from the proven kit — the same pattern as the SM movement
// pickers (movement-picker-flow.tsx): <FlowScaffold> chrome, a section
// label, a row list, a sticky submit carrying the running total. No new
// kit components; a thin per-screen mapper only.
//
// Session 16: the row is `<ReceiveLineRow>` (bottom of this file) rather
// than the kit's `<SelectableProductRow>` — the kit blocks on
// `quantity > available` regardless of `max`, which is wrong when the
// attendant received MORE than was dispatched, and it has no slot for the
// owner-requested "60 → 72" resulting-balance line. See its docblock.

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  useStockLevels,
  stockApi,
  StockRequestError,
  deriveIncomingTransfers,
} from "@/app/store-manager/use-staff-stock";
import { trimQty } from "@/app/store-manager/staff-stock-format";
import { FlowScaffold } from "@/app/store-manager/flows/flow-scaffold";
import { ResultingBalanceLine } from "@/app/store-manager/flows/movement-picker-flow";

function toNum(s: string): number {
  return Math.abs(Number.parseFloat(s) || 0);
}
function fmt(n: number): string {
  return trimQty(String(n));
}

export function ReceiveTransferFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  const myLocationId =
    data.locations.find((l) => l.type === "canteen")?.id ??
    data.movements[0]?.locationId ??
    null;

  const incoming = React.useMemo(
    () => deriveIncomingTransfers(data.movements, myLocationId),
    [data.movements, myLocationId],
  );

  // Session 16 (owner): the review must show what's already on the shelf
  // and what the line will make it. Derived Canteen balances, same read
  // the pickers use. Non-fatal — a failed/pending balances read just
  // omits the before→after line rather than blocking the receive.
  const stockLevels = useStockLevels(myLocationId || undefined);
  const onHandById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stockLevels.rows) {
      m.set(r.productId, Number.parseFloat(r.quantity) || 0);
    }
    return m;
  }, [stockLevels.rows]);
  const balancesReady = !stockLevels.loading && !stockLevels.error;

  // Per-line received quantity, keyed by the dispatch row id, pre-filled to
  // the dispatched magnitude the first time each line appears.
  const [received, setReceived] = React.useState<Map<string, number>>(new Map());
  React.useEffect(() => {
    setReceived((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const { movement } of incoming) {
        if (!next.has(movement.id)) {
          next.set(movement.id, toNum(movement.quantity));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [incoming]);

  const [submitting, setSubmitting] = React.useState(false);

  const productName = (id: string) =>
    data.products.find((p) => p.id === id)?.name ?? "stock";
  const productUnit = (id: string) =>
    data.products.find((p) => p.id === id)?.unitLabel ?? "";

  const lines = incoming.map(({ movement }) => {
    const dispatched = toNum(movement.quantity);
    const qty = received.get(movement.id) ?? dispatched;
    return { movement, dispatched, qty };
  });

  const anyBlank = lines.some((l) => !(l.qty > 0));
  const total = lines.reduce((s, l) => s + l.qty, 0);
  const unitLabels = new Set(lines.map((l) => productUnit(l.movement.productId)));
  const unit = unitLabels.size === 1 ? [...unitLabels][0] || "units" : "units";
  const varianceCount = lines.filter((l) => l.qty !== l.dispatched).length;

  const canSubmit = !loading && !error && lines.length > 0 && !anyBlank;
  const submitLabel = canSubmit
    ? `Receive (+${fmt(total)} ${unit})`
    : "Receive";

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await stockApi.acceptTransferBatch(
        lines.map((l) => ({
          movementId: l.movement.id,
          // Only send receivedQuantity when the CA actually changed it.
          receivedQuantity:
            l.qty !== l.dispatched ? fmt(l.qty) : undefined,
        })),
      );
      toast(
        `Received ${lines.length} ${lines.length === 1 ? "item" : "items"}` +
          (varianceCount > 0 ? ` · ${varianceCount} adjusted` : ""),
        { tone: "success" },
      );
      router.push("/canteen");
    } catch (e) {
      const msg =
        e instanceof StockRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't receive the transfer.";
      toast(msg, { tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <FlowScaffold
        title="Receive Transfer"
        direction="Incoming → Canteen"
        directionTone="info"
        submitLabel="Receive"
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState
          title="Couldn't load incoming transfers"
          description={error}
          onRetry={refresh}
        />
      </FlowScaffold>
    );
  }

  return (
    <FlowScaffold
      title="Receive Transfer"
      direction="Incoming → Canteen"
      directionTone="info"
      submitLabel={submitLabel}
      submitDisabled={!canSubmit}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      {loading ? (
        <>
          <div className="kit-skeleton h-[56px] rounded-lg" />
          <div className="kit-skeleton h-[56px] rounded-lg" />
        </>
      ) : lines.length === 0 ? (
        <EmptyState
          title="Nothing to receive"
          description="No transfers are waiting for the Canteen right now."
        />
      ) : (
        <>
          <div className="flex flex-col gap-(--sp-3)">
            <p className="font-ui font-(--weight-semibold) [color:var(--text-tertiary)] text-micro/micro uppercase tracking-[0.04em]">
              Confirm what arrived
            </p>

            {lines.map(({ movement, dispatched, qty }) => (
              <ReceiveLineRow
                key={movement.id}
                lineId={movement.id}
                name={productName(movement.productId)}
                unit={productUnit(movement.productId)}
                dispatched={dispatched}
                quantity={qty}
                onHand={
                  balancesReady
                    ? (onHandById.get(movement.productId) ?? 0)
                    : null
                }
                onQuantityChange={(id, n) =>
                  setReceived((prev) => {
                    const next = new Map(prev);
                    next.set(id, n);
                    return next;
                  })
                }
              />
            ))}
          </div>

          {anyBlank ? (
            <div
              role="status"
              className="[font-synthesis:none] flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-danger-bg antialiased"
            >
              <div className="font-ui inline-block text-danger text-sm/sm">
                Every line needs a quantity of at least 1. Set it, or go back
                if a line shouldn&rsquo;t arrive at all.
              </div>
            </div>
          ) : (
            <CalculatedImpactBanner>
              {varianceCount > 0
                ? `Adds ${fmt(total)} ${unit} to Canteen stock — ${varianceCount} ${
                    varianceCount === 1 ? "line differs" : "lines differ"
                  } from what was sent.`
                : `Adds ${fmt(total)} ${unit} to Canteen stock, matching what was sent.`}
            </CalculatedImpactBanner>
          )}
        </>
      )}
    </FlowScaffold>
  );
}

/**
 * One "confirm what arrived" line. Screen-local rather than the kit's
 * `<SelectableProductRow>` for two reasons, both Session 16:
 *
 *  1. The kit computes `blocked = quantity > available` off `available`
 *     (NOT off `max`), so passing the dispatched quantity as `available`
 *     painted the §9.8 over-stock treatment the moment the attendant
 *     recorded MORE than was sent — a legitimate case here (the sender
 *     may have under-counted). `max={Infinity}` does not suppress it.
 *  2. The owner asked the review to show the resulting shelf balance, and
 *     the kit row has no slot for a second line.
 *
 * The kit is frozen (CONVENTIONS §6) — no fork. This mirrors the picker's
 * `AdditiveStepperRow` markup and the ADR-43 / ADR-48 stepper contract
 * (tap-to-type, commit on blur / Enter, ↑ / ↓ step), with no ceiling and
 * no block, and it never deselects: stepping to 0 leaves a blank line the
 * submit guard catches.
 */
function ReceiveLineRow({
  lineId,
  name,
  unit,
  dispatched,
  quantity,
  onHand,
  onQuantityChange,
}: {
  lineId: string;
  name: string;
  unit: string;
  dispatched: number;
  quantity: number;
  /** Derived Canteen balance, or `null` while the read is pending/failed. */
  onHand: number | null;
  onQuantityChange: (lineId: string, next: number) => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const display = editing ?? fmt(quantity);
  const sentLabel = `Sent: ${fmt(dispatched)} ${unit}`;

  function commit(raw: string) {
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) {
      setEditing(null);
      return;
    }
    onQuantityChange(lineId, n < 0 ? 0 : n);
    setEditing(null);
  }

  function step_(delta: number) {
    const next = quantity + delta;
    onQuantityChange(lineId, next < 0 ? 0 : next);
  }

  return (
    <div
      role="group"
      aria-label={`${name}, ${sentLabel}, quantity ${fmt(quantity)} ${unit}`}
      data-selected
      className="[font-synthesis:none] antialiased flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid bg-(--surface-selected) border-accent"
    >
      <div className="flex items-center gap-[8px]">
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-micro/micro">
          {sentLabel}
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
                aria-valuetext={`${fmt(quantity)} ${unit}`}
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

      {onHand !== null && (
        <ResultingBalanceLine before={onHand} added={quantity} unit={unit} />
      )}
    </div>
  );
}
