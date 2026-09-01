"use client";

// Canteen Mobile Operations Hub — composed from the proven kit (Session 12,
// ADR-44: the kit is the visual acceptance target; the Session-4b artboard
// 9BA-0 is superseded). Same shape as the Store Manager hub.
//
// Composition:
//   • one pinned <TransferBanner> when transfers are incoming (ADR-39) —
//     "N items incoming — Review & Receive" → navigates to
//     /canteen/transfer/receive, where the attendant confirms/adjusts the
//     quantities and accepts. No inline one-tap accept, no flag-to-admin.
//   • <ActionTileGrid> — Transfer Dispatch / Stock Count / Stock Levels.
//   • <ActivityTimeline> — today's canteen movement log / empty line.
//   • <ErrorState> on a fetch failure.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ClipboardList, Boxes } from "lucide-react";
import { ActionTileGrid, type ActionTile } from "@/components/kit/action-tile-grid";
import { ActivityTimeline } from "@/components/kit/activity-timeline";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { Button } from "@/components/kit/button";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  deriveIncomingTransfers,
} from "@/app/store-manager/use-staff-stock";
import {
  movementsToTimeline,
  trimQty,
} from "@/app/store-manager/staff-stock-format";
import {
  useDerivedSales,
  useStockCountActions,
} from "@/app/canteen/use-stock-count";
import { nairobiBusinessDate } from "@/app/cashier/use-orders";

const TILE_ICON_PROPS = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function CanteenHubClient({ locationLabel }: { locationLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  // F7-3 (QA S7) — today's canteen stock counts, so the attendant can
  // undo a mistaken same-day count (the `voidStockCount` recovery path,
  // owner decision 2026-08-30). The full 9-state K1 rebuild with a
  // FrictionDeleteDialog is Batch 3d; this is the reachable minimum.
  const today = nairobiBusinessDate();
  const { rows: derivedToday, refresh: refreshDerived } = useDerivedSales({
    date: today,
  });
  const { voidStockCount } = useStockCountActions();
  const [voidingId, setVoidingId] = React.useState<string | null>(null);

  const todaysCounts = derivedToday.filter(
    (r) => r.stockCountId != null && r.lastCountedAt != null,
  );

  async function onDeleteCount(row: (typeof todaysCounts)[number]) {
    if (!row.stockCountId) return;
    const ok = window.confirm(
      `Delete today's count for ${row.productName}? ` +
        `The stock count and the sale it created (${trimQty(
          row.unitsSold ?? "0",
        )} sold) will be removed. Do a fresh count to replace it.`,
    );
    if (!ok) return;
    setVoidingId(row.stockCountId);
    try {
      await voidStockCount(row.stockCountId);
      toast(`Count deleted · ${row.productName} sale removed`, { tone: "info" });
      await Promise.all([refresh(), refreshDerived()]);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Couldn't delete the count.",
        { tone: "danger" },
      );
    } finally {
      setVoidingId(null);
    }
  }

  const myLocationId =
    data.locations.find((l) => l.type === "canteen")?.id ??
    data.movements[0]?.locationId ??
    null;

  const incoming = deriveIncomingTransfers(data.movements, myLocationId);
  const timeline = movementsToTimeline(data.movements, data.products);
  const incomingUnits = incoming.reduce(
    (sum, { movement }) =>
      sum + Math.abs(Number.parseFloat(movement.quantity) || 0),
    0,
  );

  const tiles: ActionTile[] = [
    {
      icon: <ArrowLeftRight {...TILE_ICON_PROPS} stroke="var(--color-info)" />,
      label: "Transfer Dispatch",
      subLabel: "Return stock to Store",
      onClick: () => router.push("/canteen/transfer"),
    },
    {
      // M2 6d: Canteen stock count route (app/canteen/stock-count) implements K1.
      icon: <ClipboardList {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Stock Count",
      subLabel: "Derives sales & closing",
      onClick: () => router.push("/canteen/stock-count"),
    },
    {
      icon: <Boxes {...TILE_ICON_PROPS} stroke="var(--text-secondary)" />,
      label: "Stock Levels",
      subLabel: "Current on-hand",
      onClick: () => router.push("/canteen/stock"),
    },
  ];

  return (
    <div className="flex flex-col gap-(--sp-6) px-(--sp-6) py-(--sp-6)">
      {incoming.length > 0 && (
        <div role="region" aria-label="Incoming transfers" className="flex flex-col gap-(--sp-4)">
          <InstructionalBanner
            step={incoming.length}
            title={`${incoming.length} ${
              incoming.length === 1 ? "item" : "items"
            } incoming — Review & Receive`}
            body={`${trimQty(String(incomingUnits))} unit${
              incomingUnits === 1 ? "" : "s"
            } dispatched from Store / Restaurant. Confirm what actually arrived.`}
          />
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push("/canteen/transfer/receive")}
          >
            Review &amp; Receive
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Canteen workflows
        </div>
        <ActionTileGrid tiles={tiles} className="w-full" />
      </div>

      {todaysCounts.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Today&rsquo;s stock counts
          </div>
          <ul className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] overflow-hidden">
            {todaysCounts.map((row) => (
              <li
                key={row.stockCountId}
                className="flex items-center justify-between gap-(--sp-4) px-(--sp-5) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                    {row.productName}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {trimQty(row.unitsSold ?? "0")} sold ·{" "}
                    {row.revenue ? `KES ${row.revenue}` : "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteCount(row)}
                  disabled={voidingId === row.stockCountId}
                  className="font-ui font-(--weight-medium) text-danger text-caption/micro kit-focus-ring rounded-sm shrink-0 disabled:opacity-50"
                >
                  {voidingId === row.stockCountId
                    ? "Deleting…"
                    : "Delete today’s count"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Today&rsquo;s canteen log
        </div>
        {error ? (
          <ErrorState
            title="Couldn't load the hub"
            description={error}
            onRetry={refresh}
          />
        ) : (
          <ActivityTimeline
            rows={loading ? [] : timeline}
            emptyMessage={
              loading ? "Loading…" : `No movements logged at ${locationLabel} today`
            }
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
