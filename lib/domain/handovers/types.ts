import type { Prisma } from "@prisma/client";

/**
 * Handover & Reconciliation domain shapes (PRD §4.5 / §4.7, ADR-53).
 *
 * At day end a Cashier or Canteen Attendant DECLARES the cash + M-Pesa
 * they are handing to the Admin; the Admin RECORDS RECEIPT of what they
 * actually got. The system computes `variance = received − declared` per
 * channel (negative = shortfall) and **stores it permanently** on the
 * `ReceiptOfHandover` row — it is never recomputed on read (PRD §4.5).
 *
 * A handover is a **custody transfer**, not new revenue — the takings
 * were already booked to the money ledger when each sale was recorded, so
 * recording a receipt writes **no `MoneyMovement`** (ADR-53). Money is
 * `Prisma.Decimal` inside the domain, 2dp decimal string at the route
 * boundary.
 */

/** Acting-user context for handover mutations / reads. */
export type HandoverActor = {
  userId: string;
  role: string;
};

// ── Declare ─────────────────────────────────────────────────────────────

export type DeclareHandoverInput = {
  /** Decimal string ≥ 0. */
  cashDeclared: string;
  /** Decimal string ≥ 0. */
  mpesaDeclared: string;
  /** Defaults to now. Its Africa/Nairobi business day is day-close gated. */
  occurredAt?: Date;
};

export type EditOwnHandoverInput = {
  cashDeclared: string;
  mpesaDeclared: string;
};

// ── Record receipt ──────────────────────────────────────────────────────

export type RecordReceiptInput = {
  handoverId: string;
  /** Decimal string ≥ 0. */
  cashReceived: string;
  /** Decimal string ≥ 0. */
  mpesaReceived: string;
  /**
   * Required when the receipt is short on either channel (a shortfall) —
   * recorded as a `HandoverShortfall` row against the declaring staff
   * member. Ignored when nothing is short.
   */
  shortfallNote?: string;
  /** Defaults to now. */
  occurredAt?: Date;
};

// ── Corrections (append-only, ADR-15 / CONVENTIONS §4) ───────────────────

export type CorrectHandoverInput = {
  handoverId: string;
  /** The corrected final declared figures. */
  cashDeclared: string;
  mpesaDeclared: string;
};

export type CorrectReceiptInput = {
  receiptId: string;
  /** The corrected final received figures. */
  cashReceived: string;
  mpesaReceived: string;
  /** Required if the corrected receipt is short on either channel. */
  shortfallNote?: string;
};

// ── Wire views ──────────────────────────────────────────────────────────

export type HandoverView = {
  id: string;
  staffId: string;
  staffName: string;
  locationId: string;
  locationName: string;
  /** Current derived declared figures (original + Σ correction deltas). */
  cashDeclared: string;
  mpesaDeclared: string;
  occurredAt: string;
  /** Set on a correction row — the handover it corrects. */
  correctsHandoverId: string | null;
  createdAt: string;
  receipts: ReceiptView[];
};

export type ReceiptView = {
  id: string;
  handoverId: string;
  cashReceived: string;
  mpesaReceived: string;
  /** Stored variance = received − declared (negative = shortfall). */
  cashVariance: string;
  mpesaVariance: string;
  recordedById: string;
  occurredAt: string;
  createdAt: string;
  shortfalls: ShortfallView[];
};

export type ShortfallView = {
  id: string;
  staffId: string;
  note: string;
  createdAt: string;
};

// ── Reads ───────────────────────────────────────────────────────────────

export type ListHandoversFilter = {
  /** A business date (`YYYY-MM-DD`) — `occurredAt` within that Nairobi day. */
  date?: string;
  /** Further narrows within the caller's role scope. */
  locationId?: string;
};

/**
 * One row of the Admin reconciliation view — declared vs received vs
 * variance for a handover on a date. Corrections are already folded into
 * the derived figures. `received` / `variance` are `null` until the Admin
 * records a receipt.
 */
export type ReconciliationRow = {
  handoverId: string;
  staffId: string;
  staffName: string;
  locationId: string;
  locationName: string;
  occurredAt: string;
  cashDeclared: string;
  mpesaDeclared: string;
  cashReceived: string | null;
  mpesaReceived: string | null;
  cashVariance: string | null;
  mpesaVariance: string | null;
  /** True once a receipt exists for this handover. */
  received: boolean;
  /** Any shortfall notes on the (latest) receipt. */
  shortfallNotes: string[];
  receiptId: string | null;
};

export type ReconciliationView = {
  date: string;
  rows: ReconciliationRow[];
  totals: {
    cashDeclared: string;
    mpesaDeclared: string;
    cashReceived: string;
    mpesaReceived: string;
    cashVariance: string;
    mpesaVariance: string;
  };
};

/** Internal: a `Prisma.Decimal` that may be absent. */
export type MaybeDecimal = Prisma.Decimal | null;
