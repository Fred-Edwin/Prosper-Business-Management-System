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
// label, a <SelectableProductRow> list, a sticky submit carrying the
// running total. No new kit components; a thin per-screen mapper only.

import * as React from "react";
import { useRouter } from "next/navigation";
import { SelectableProductRow } from "@/components/kit/selectable-product-row";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  stockApi,
  StockRequestError,
  deriveIncomingTransfers,
} from "@/app/store-manager/use-staff-stock";
import { trimQty } from "@/app/store-manager/staff-stock-format";
import { FlowScaffold } from "@/app/store-manager/flows/flow-scaffold";

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
              <SelectableProductRow
                key={movement.id}
                productId={movement.id}
                name={productName(movement.productId)}
                unit={productUnit(movement.productId)}
                // Additive: the CA may record more or fewer than dispatched;
                // pass a non-binding ceiling so the kit never paints the
                // §9.8 over-stock block. Readout shows the dispatched qty.
                available={dispatched}
                availableLabelPrefix="Sent:"
                max={Number.POSITIVE_INFINITY}
                selected
                quantity={qty}
                onSelect={() => {}}
                onDeselect={() => {
                  // Stepping to 0 would deselect — keep the line, clamp to
                  // a blank state the submit guard catches instead.
                  setReceived((prev) => {
                    const next = new Map(prev);
                    next.set(movement.id, 0);
                    return next;
                  });
                }}
                onQuantityChange={(_id, n) =>
                  setReceived((prev) => {
                    const next = new Map(prev);
                    next.set(movement.id, n);
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
