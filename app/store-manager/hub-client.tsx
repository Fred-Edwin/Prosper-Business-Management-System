"use client";

// Store Manager Mobile Hub — composed from the proven kit (Session 12,
// ADR-44: the kit is the visual acceptance target; the Session-4b artboard
// 8T3-0 is superseded — it was transcribed inline before the kit existed).
//
// Composition:
//   • pinned <TransferBanner> per incoming transfer (ADR-39) — Accept →
//     POST …/accept, Flag → POST …/accept { flag, note }; a flagged one
//     shows the muted "awaiting admin" line.
//   • pinned <PurchaseDeliveryBanner> per incoming delivery — the real
//     SM-scoped `GET /api/stock-movements/outstanding` read
//     (`useOutstandingDeliveries`). Session 16: this replaced an empty
//     fixture that predated the endpoint being widened to the SM, so the
//     banner never rendered and an Admin purchase had no staff-facing
//     "receive it" path at all. "Match & receive" routes to the Receive
//     flow rather than one-tap writing a receipt — the flow is where the
//     SM confirms what ACTUALLY arrived (a delivery can be short).
//   • <ActionTileGrid> — Receive / Issue / Production / Transfer / Non-Sale.
//   • <ActivityTimeline> — today's movement log, or its empty line.
//   • <ErrorState> on a fetch failure (Retry → refresh).

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, ArrowUpRight, ChefHat, ArrowLeftRight, Trash2 } from "lucide-react";
import { ActionTileGrid, type ActionTile } from "@/components/kit/action-tile-grid";
import { ActivityTimeline } from "@/components/kit/activity-timeline";
import { TransferBanner, PurchaseDeliveryBanner } from "@/components/kit/banner";
import { MatchCard } from "@/components/kit/match-card";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  useOutstandingDeliveries,
  stockApi,
  deriveIncomingTransfers,
} from "./use-staff-stock";
import { movementsToTimeline, todaysMovements, trimQty } from "./staff-stock-format";

// (Session 16 — the `MOCK_PENDING_DELIVERIES` fixture that stood here is
// gone; `useOutstandingDeliveries()` is the real read. See the header.)

const TILE_ICON_PROPS = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function StoreManagerHubClient({ locationLabel }: { locationLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();
  // Deliveries the Admin has paid for and nobody has received yet
  // (SM-scoped `GET …/outstanding`). Non-fatal on failure — the hub still
  // renders without the banner, same as the Receive flow treats it.
  const outstanding = useOutstandingDeliveries();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // The Store's own locationId — resolved from any movement row at this
  // location (the list is already scoped to it server-side).
  const myLocationId =
    data.locations.find((l) => l.type === "store")?.id ??
    data.movements[0]?.locationId ??
    null;

  const incoming = deriveIncomingTransfers(data.movements, myLocationId);
  const timeline = movementsToTimeline(todaysMovements(data.movements), data.products);

  const productName = (id: string) =>
    data.products.find((p) => p.id === id)?.name ?? "stock";
  const productUnit = (id: string) =>
    data.products.find((p) => p.id === id)?.unitLabel ?? "";

  async function onAccept(movementId: string, productId: string, qty: string) {
    setBusyId(movementId);
    try {
      await stockApi.acceptTransfer(movementId);
      toast(
        `Accepted ${trimQty(qty).replace("-", "")} ${productUnit(productId)} ${productName(productId)}`,
        { tone: "success" },
      );
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't accept the transfer.", {
        tone: "danger",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function onFlag(movementId: string) {
    const note = window.prompt("Describe the variance (what arrived vs. expected):");
    if (note == null || note.trim() === "") return;
    setBusyId(movementId);
    try {
      await stockApi.flagTransfer(movementId, note.trim());
      toast("Variance flagged — the Admin will review it.", { tone: "info" });
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't flag the transfer.", {
        tone: "danger",
      });
    } finally {
      setBusyId(null);
    }
  }

  // A delivery can arrive short, so the banner does NOT one-tap write a
  // receipt for the ordered quantity — it routes to the Receive flow,
  // where the SM confirms what actually turned up (the flow's
  // "Deliveries awaiting receipt" <MatchCard> list pre-fills the line).
  // Mirrors the Canteen's "Review & Receive" banner behaviour.
  function onReceiveDelivery() {
    router.push("/store-manager/flows/receive");
  }

  // Deliveries awaiting receipt, once the read has settled cleanly.
  const pendingDeliveries =
    outstanding.loading || outstanding.error ? [] : outstanding.rows;
  const pendingCount = pendingDeliveries.length;

  const tiles: ActionTile[] = [
    {
      icon: <PackagePlus {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Receive Goods",
      subLabel: pendingCount
        ? `${pendingCount} ${pendingCount === 1 ? "delivery" : "deliveries"} pending`
        : "Log a supplier delivery",
      badge: pendingCount > 0,
      onClick: () => router.push("/store-manager/flows/receive"),
    },
    {
      icon: <ArrowUpRight {...TILE_ICON_PROPS} stroke="var(--color-danger)" />,
      label: "Issue to Kitchen",
      subLabel: "Raw ingredients",
      onClick: () => router.push("/store-manager/flows/issue"),
    },
    {
      icon: <ChefHat {...TILE_ICON_PROPS} stroke="var(--color-success)" />,
      label: "Record Production",
      subLabel: "Cooked batches",
      onClick: () => router.push("/store-manager/flows/production"),
    },
    {
      icon: <ArrowLeftRight {...TILE_ICON_PROPS} stroke="var(--color-info)" />,
      label: "Transfer to Canteen",
      subLabel: "Goods & sodas",
      onClick: () => router.push("/store-manager/flows/transfer"),
    },
    {
      icon: <Trash2 {...TILE_ICON_PROPS} stroke="var(--color-warning)" />,
      label: "Log Non-Sale",
      subLabel: "Staff meals & spoilage",
      onClick: () => router.push("/store-manager/flows/non-sale"),
    },
  ];

  return (
    <div className="flex flex-col gap-(--sp-6) px-(--sp-6) py-(--sp-6)">
      {/* Pinned incoming-stock banners */}
      {incoming.map(({ movement, flagged }) => (
        <TransferBanner
          key={movement.id}
          title={`Incoming transfer · ${productName(movement.productId)}`}
          detail={`${trimQty(movement.quantity).replace("-", "")} ${productUnit(
            movement.productId,
          )} dispatched ${new Date(movement.occurredAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`}
          primaryLabel={
            busyId === movement.id
              ? "Accepting…"
              : `Accept (+${trimQty(movement.quantity).replace("-", "")} ${productUnit(
                  movement.productId,
                )})`
          }
          flagged={flagged}
          onPrimary={() =>
            onAccept(movement.id, movement.productId, movement.quantity)
          }
          onFlag={() => onFlag(movement.id)}
        />
      ))}

      {pendingDeliveries.map((d) => {
          const qty = d.purchaseOrderedQty
            ? trimQty(d.purchaseOrderedQty)
            : "?";
          const unit = productUnit(d.productId);
          return (
            <PurchaseDeliveryBanner
              key={d.id}
              title={`Purchase delivery pending · ${productName(d.productId)}`}
              detail={`${qty} ${unit} · ${d.purchaseSupplier ?? "Supplier"}`}
              primaryLabel="Review & receive"
              onPrimary={onReceiveDelivery}
              // No Flag action: `onFlag` is the two-phase TRANSFER variance
              // path (`flagTransfer`, ADR-39) and would reject a
              // `purchase_payment` row. A short delivery is reported by
              // receiving the actual quantity in the Receive flow, which is
              // the designed path — the receipt-vs-payment mismatch is what
              // the Admin's reconciliation reads.
            />
          );
        })}

      {/* Quick operations */}
      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Quick store operations
        </div>
        <ActionTileGrid tiles={tiles} className="w-full" />
      </div>

      {/* Today's movement log */}
      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Today&rsquo;s movement log
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
