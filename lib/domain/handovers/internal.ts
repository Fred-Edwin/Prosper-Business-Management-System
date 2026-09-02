import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

type Db = Prisma.TransactionClient | typeof prisma;
import type {
  HandoverView,
  ReceiptView,
  ShortfallView,
} from "./types";

export const ZERO = new Prisma.Decimal(0);

/** `Decimal` → 2dp decimal string. */
export function moneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

/**
 * Parse a money input string to a non-negative `Decimal`. Handover
 * figures are always ≥ 0 — a negative declaration or receipt is a data
 * error, not a business case (a shortfall is expressed by the *variance*,
 * not a negative amount).
 */
export function toMoney(value: string, field: string): Prisma.Decimal {
  let d: Prisma.Decimal;
  try {
    d = new Prisma.Decimal(value);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Must be a number.", field);
  }
  if (!d.isFinite() || d.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Must be zero or a positive amount.",
      field,
    );
  }
  return d;
}

type ShortfallRow = {
  id: string;
  staffId: string;
  note: string;
  createdAt: Date;
};

type ReceiptRow = {
  id: string;
  handoverId: string;
  cashReceived: Prisma.Decimal;
  mpesaReceived: Prisma.Decimal;
  cashVariance: Prisma.Decimal;
  mpesaVariance: Prisma.Decimal;
  recordedById: string;
  occurredAt: Date;
  createdAt: Date;
  shortfalls: ShortfallRow[];
};

type HandoverRow = {
  id: string;
  staffId: string;
  staff: { name: string };
  locationId: string;
  location: { name: string };
  cashDeclared: Prisma.Decimal;
  mpesaDeclared: Prisma.Decimal;
  occurredAt: Date;
  correctsHandoverId: string | null;
  createdAt: Date;
  receipts: ReceiptRow[];
};

export function toShortfallView(row: ShortfallRow): ShortfallView {
  return {
    id: row.id,
    staffId: row.staffId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toReceiptView(row: ReceiptRow): ReceiptView {
  return {
    id: row.id,
    handoverId: row.handoverId,
    cashReceived: moneyString(row.cashReceived),
    mpesaReceived: moneyString(row.mpesaReceived),
    cashVariance: moneyString(row.cashVariance),
    mpesaVariance: moneyString(row.mpesaVariance),
    recordedById: row.recordedById,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    shortfalls: row.shortfalls.map(toShortfallView),
  };
}

/**
 * Wire view of a handover with its **current derived declared figures**
 * (`original + Σ correction deltas`). `derivedCash` / `derivedMpesa` are
 * passed in by the caller, which has already summed the corrections;
 * `row` supplies identity + relations.
 */
export function toHandoverView(
  row: HandoverRow,
  derivedCash: Prisma.Decimal,
  derivedMpesa: Prisma.Decimal,
): HandoverView {
  return {
    id: row.id,
    staffId: row.staffId,
    staffName: row.staff.name,
    locationId: row.locationId,
    locationName: row.location.name,
    cashDeclared: moneyString(derivedCash),
    mpesaDeclared: moneyString(derivedMpesa),
    occurredAt: row.occurredAt.toISOString(),
    correctsHandoverId: row.correctsHandoverId,
    createdAt: row.createdAt.toISOString(),
    receipts: row.receipts.map(toReceiptView),
  };
}

/**
 * The **current derived declared figures** for a handover:
 * `original + Σ (every correction delta pointing at it)`.
 *
 * Corrections are append-only delta rows (`correctsHandoverId` set,
 * `cashDeclared` / `mpesaDeclared` = the signed delta). Corrections never
 * chain (§4 / ADR-15), so one level of summation is exhaustive. Pass a
 * `tx` when inside a transaction so the sum sees the same snapshot as the
 * writes.
 */
export async function deriveDeclared(
  db: Db,
  handoverId: string,
): Promise<{ cash: Prisma.Decimal; mpesa: Prisma.Decimal } | null> {
  const original = await db.handover.findUnique({
    where: { id: handoverId },
    select: { cashDeclared: true, mpesaDeclared: true },
  });
  if (!original) return null;

  const deltas = await db.handover.aggregate({
    _sum: { cashDeclared: true, mpesaDeclared: true },
    where: { correctsHandoverId: handoverId },
  });

  return {
    cash: original.cashDeclared.add(deltas._sum.cashDeclared ?? ZERO),
    mpesa: original.mpesaDeclared.add(deltas._sum.mpesaDeclared ?? ZERO),
  };
}

export const HANDOVER_INCLUDE = {
  staff: { select: { name: true } },
  location: { select: { name: true } },
  receipts: {
    orderBy: { createdAt: "asc" },
    include: { shortfalls: { orderBy: { createdAt: "asc" } } },
  },
} as const;
