"use client";

// Store Manager Mobile Hub — composed from the proven kit (Session 12,
// ADR-44: the kit is the visual acceptance target; the Session-4b artboard
// 8T3-0 is superseded — it was transcribed inline before the kit existed).
//
// Composition:
//   • pinned <TransferBanner> per incoming transfer (ADR-39) — Accept →
//     POST …/accept, Flag → POST …/accept { flag, note }; a flagged one
//     shows the muted "awaiting admin" line.
//   • pinned <PurchaseDeliveryBanner> / <MatchCard> for an incoming
//     delivery — TODO(mock): no staff-facing endpoint exists yet
//     (GET …/outstanding is Admin-only), so this reads a fixture behind
//     the real interface.
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
import { useStaffStock, stockApi, deriveIncomingTransfers } from "./use-staff-stock";
import { movementsToTimeline, todaysMovements, trimQty } from "./staff-stock-format";

// TODO(mock): the Store Manager has no endpoint for incoming purchase
// deliveries — GET /api/stock-movements/outstanding is Admin-only
// (docs/API.md). When a staff-scoped "deliveries awaiting receipt" read
// lands, replace this fixture; the shape below is what <MatchCard> +
// stockApi.recordPurchaseReceipt already consume.
type PendingDelivery = {
  purchasePaymentId: string;
  productId: string;
  locationId: string;
  supplier: string;
  quantity: string;
  unitLabel: string;
};
const MOCK_PENDING_DELIVERIES: PendingDelivery[] = [];

const TILE_ICON_PROPS = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function StoreManagerHubClient({ locationLabel }: { locationLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();
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

  async function onReceiveDelivery(d: PendingDelivery) {
    setBusyId(d.purchasePaymentId);
    try {
      await stockApi.recordPurchaseReceipt({
        productId: d.productId,
        locationId: d.locationId,
        quantity: d.quantity,
        purchasePaymentId: d.purchasePaymentId,
      });
      toast(`Received ${trimQty(d.quantity)} ${d.unitLabel} ${d.supplier}`, {
        tone: "success",
      });
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't receive the delivery.", {
        tone: "danger",
      });
    } finally {
      setBusyId(null);
    }
  }

  const tiles: ActionTile[] = [
    {
      icon: <PackagePlus {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Receive Goods",
      subLabel: MOCK_PENDING_DELIVERIES.length
        ? `${MOCK_PENDING_DELIVERIES.length} delivery pending`
        : "Log a supplier delivery",
      badge: MOCK_PENDING_DELIVERIES.length > 0,
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

      {MOCK_PENDING_DELIVERIES.map((d) => (
        <PurchaseDeliveryBanner
          key={d.purchasePaymentId}
          title={`Purchase delivery pending · ${productName(d.productId)}`}
          detail={`${trimQty(d.quantity)} ${d.unitLabel} · ${d.supplier}`}
          primaryLabel={`Match & receive (+${trimQty(d.quantity)} ${d.unitLabel})`}
          onPrimary={() => onReceiveDelivery(d)}
          onFlag={() => onFlag(d.purchasePaymentId)}
        />
      ))}

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
