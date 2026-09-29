// Which ledger column (Transfer In / Transfer Out) a `transfer` row feeds.
// Shared by derive-ledger, derive-period-summary and derive-product-days.
//
// An ORIGINAL transfer row's sign is its direction: `-q` at the sender is a
// Transfer Out, `+q` at the receiver a Transfer In. A correction delta
// (`correctMovement`, ADR-15) is NOT — its sign is the direction of the
// adjustment, not of the transfer. Correcting a -95 dispatch to -67 writes a
// +28 delta; routing that by its own sign put it under Transfer In while the
// -95 stayed under Transfer Out, so both columns were wrong even though the
// closing was right (client report 2026-09-29, mandazi 24 Sep, ADR-94).
//
// So a delta takes the direction of the row it corrects — but only when that
// row is at the SAME location. A transfer's receiver leg also carries
// `correctsMovementId` (pointing at the sender's dispatch, ADR-39), and that
// row's own sign is already its direction.

import type { StockMovementView } from "@/lib/domain/stock";

export type TransferColumn = "transferIn" | "transferOut";

export function transferColumn(
  m: StockMovementView,
  byId: ReadonlyMap<string, StockMovementView>,
): TransferColumn {
  const target = m.correctsMovementId ? byId.get(m.correctsMovementId) : undefined;
  const basis = target && target.locationId === m.locationId ? target : m;
  return Number(basis.quantity) >= 0 ? "transferIn" : "transferOut";
}
