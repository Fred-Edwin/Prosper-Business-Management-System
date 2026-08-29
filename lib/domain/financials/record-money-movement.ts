import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MoneyWriteContext, RecordMoneyMovementInput } from "./types";

/**
 * Append **one** row to the money ledger (ADR-17). This is the single
 * write path for `MoneyMovement`; nothing else in the codebase should
 * `prisma.moneyMovement.create` directly.
 *
 * Not routed in M2. Callers:
 *   - `recordRepayment` (this session) — `sourceType: "repayment"`.
 *   - `createOrder` (S4) — `sourceType: "order"` for a Cash/M-Pesa order.
 *   - `recordStockCount` (S5) — `sourceType: "canteen_sale"`.
 *
 * `amount` is **signed** — positive for money in, negative for money out —
 * so the derived balance is a plain `SUM(amount)` with no per-row sign
 * logic (see `getAccountBalances`).
 *
 * Pass `ctx.tx` to run inside an already-open transaction: S4/S5 write the
 * `Order` / `StockCount`, its `StockMovement` rows, and this money row in
 * one transaction so stock and money commit together or not at all. With
 * no `tx`, this opens its own transaction so the `MoneyMovement` and its
 * `AuditLog` row are still atomic.
 *
 * Every write also inserts an `AuditLog` row (ADR-25): `entityType =
 * "money_movement"`, `action = "create"`, `userId = ctx.actorId`.
 *
 * NO CORRECTION PATH IN M2. When one is needed it is a *new* offsetting
 * row linked via `correctsMovementId` (ADR-15) — never an update to an
 * existing row. This module is shaped for that drop-in; it is not built.
 */
export async function recordMoneyMovement(
  input: RecordMoneyMovementInput,
  ctx: MoneyWriteContext,
) {
  const write = async (tx: Prisma.TransactionClient) => {
    const row = await tx.moneyMovement.create({
      data: {
        account: input.account,
        amount: input.amount,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        recordedById: ctx.actorId,
        occurredAt: input.occurredAt,
        note: input.note ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        action: "create",
        entityType: "money_movement",
        entityId: row.id,
        newValue: {
          account: row.account,
          amount: row.amount.toFixed(2),
          sourceType: row.sourceType,
          sourceId: row.sourceId,
        },
        occurredAt: row.occurredAt,
      },
    });

    return row;
  };

  if (ctx.tx) return write(ctx.tx);
  return prisma.$transaction(write);
}
