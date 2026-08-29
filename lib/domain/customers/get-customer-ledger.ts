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

  const [debts, repayments] = await Promise.all([
    prisma.debt.findMany({ where: { customerId } }),
    prisma.repayment.findMany({ where: { customerId } }),
  ]);

  type Raw = {
    kind: "debt" | "repayment";
    amount: Prisma.Decimal;
    occurredAt: Date;
    createdAt: Date;
    orderId?: string;
  };

  const raw: Raw[] = [
    ...debts.map((d) => ({
      kind: "debt" as const,
      amount: d.amount,
      occurredAt: d.occurredAt,
      createdAt: d.createdAt,
      orderId: d.orderId,
    })),
    ...repayments.map((r) => ({
      kind: "repayment" as const,
      amount: r.amount,
      occurredAt: r.occurredAt,
      createdAt: r.createdAt,
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
      runningBalance: moneyString(running),
    };
  });

  return {
    customer: toCustomerView(customer),
    entries,
    balance: moneyString(running),
  };
}
