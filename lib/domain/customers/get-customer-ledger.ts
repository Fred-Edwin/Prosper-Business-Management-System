import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { moneyString, toCustomerView, ZERO } from "./internal";
import type { CustomerLedger, CustomerLedgerEntry } from "./types";

/**
 * The debt/repayment ledger for one customer (ADR-19), interleaved and
 * ordered by `occurredAt` then `createdAt`, with a running balance.
 *
 * `runningBalance` accumulates in order: `+amount` for a debt, `−amount`
 * for a repayment. The final `balance` equals the last entry's running
 * balance (or 0 for a customer with no activity) and is itself derived —
 * there is no stored total (ADR-17).
 *
 * `NOT_FOUND` if the customer does not exist.
 */
export async function getCustomerLedger(
  customerId: string,
): Promise<CustomerLedger> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    throw new DomainError("NOT_FOUND", "Customer not found.", "customerId");
  }

  const [debts, allRepayments] = await Promise.all([
    prisma.debt.findMany({
      where: { customerId },
      include: { order: { select: { number: true } } },
    }),
    prisma.repayment.findMany({ where: { customerId } }),
  ]);

  // Canteen-sourced debts (ADR-91) have no typed FK to join — resolve the
  // product name via their `sourceId` (a `StockMovement.id`) in a second
  // query, display-only. This does not change what's owed: `debts` above
  // already has the full, correct `Σ amount` for every row regardless of
  // source.
  const canteenSourceIds = debts
    .filter((d) => d.sourceType === "canteen_credit_sale" && d.sourceId)
    .map((d) => d.sourceId as string);
  const canteenMovements = canteenSourceIds.length
    ? await prisma.stockMovement.findMany({
        where: { id: { in: canteenSourceIds } },
        select: { id: true, product: { select: { name: true } } },
      })
    : [];
  const canteenProductNameBySourceId = new Map(
    canteenMovements.map((m) => [m.id, m.product.name]),
  );

  // Repayment corrections (ADR-15 / ADR-72): a correction is a signed
  // `Repayment` row (`correctsRepaymentId` set) carrying the delta. The
  // ledger shows one line per repayment with its CURRENT derived amount —
  // fold each original's correction deltas into it and drop the correction
  // rows from the list. A repayment voided to 0 drops off entirely.
  const deltasByOriginal = new Map<string, Prisma.Decimal>();
  for (const r of allRepayments) {
    if (r.correctsRepaymentId) {
      deltasByOriginal.set(
        r.correctsRepaymentId,
        (deltasByOriginal.get(r.correctsRepaymentId) ?? ZERO).plus(r.amount),
      );
    }
  }
  const repayments = allRepayments
    .filter((r) => r.correctsRepaymentId === null)
    .map((r) => {
      const delta = deltasByOriginal.get(r.id);
      return delta ? { ...r, amount: r.amount.plus(delta) } : r;
    })
    .filter((r) => !r.amount.isZero());

  type Raw = {
    kind: "debt" | "repayment";
    amount: Prisma.Decimal;
    occurredAt: Date;
    createdAt: Date;
    orderId?: string;
    orderNumber?: number;
    debtSourceType?: "order" | "canteen_credit_sale";
    canteenProductName?: string;
    account?: "cash" | "mpesa_bank";
    note?: string;
    repaymentId?: string;
  };

  const raw: Raw[] = [
    ...debts.map((d) => ({
      kind: "debt" as const,
      amount: d.amount,
      occurredAt: d.occurredAt,
      createdAt: d.createdAt,
      orderId: d.orderId ?? undefined,
      orderNumber: d.order?.number,
      debtSourceType: d.sourceType,
      canteenProductName:
        d.sourceType === "canteen_credit_sale" && d.sourceId
          ? canteenProductNameBySourceId.get(d.sourceId)
          : undefined,
    })),
    ...repayments.map((r) => ({
      kind: "repayment" as const,
      amount: r.amount,
      occurredAt: r.occurredAt,
      createdAt: r.createdAt,
      account: r.account,
      note: r.note ?? undefined,
      repaymentId: r.id,
    })),
  ];

  raw.sort((a, b) => {
    const t = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (t !== 0) return t;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  let running = ZERO;
  const entries: CustomerLedgerEntry[] = raw.map((e) => {
    running =
      e.kind === "debt" ? running.plus(e.amount) : running.minus(e.amount);
    return {
      kind: e.kind,
      amount: moneyString(e.amount),
      occurredAt: e.occurredAt.toISOString(),
      ...(e.orderId ? { orderId: e.orderId } : {}),
      ...(e.orderNumber != null ? { orderNumber: e.orderNumber } : {}),
      ...(e.debtSourceType ? { debtSourceType: e.debtSourceType } : {}),
      ...(e.canteenProductName
        ? { canteenProductName: e.canteenProductName }
        : {}),
      ...(e.account ? { account: e.account } : {}),
      ...(e.note ? { note: e.note } : {}),
      ...(e.repaymentId ? { repaymentId: e.repaymentId } : {}),
      runningBalance: moneyString(running),
    };
  });

  return {
    customer: toCustomerView(customer),
    entries,
    balance: moneyString(running),
  };
}
