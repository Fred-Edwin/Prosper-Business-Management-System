import { Prisma } from "@prisma/client";
import type { OrderType, PaymentMethod, MoneyAccount } from "@prisma/client";
import { recordMoneyMovement } from "@/lib/domain/financials";
import { recordDebt } from "@/lib/domain/customers";
import { DomainError } from "./errors";
import {
  ZERO,
  computeLineSubtotal,
  computeTotal,
  toMoney,
  toQuantity,
} from "./internal";
import type { CreateOrderInput } from "./types";

/**
 * Shared validation + write body for `createOrder` / `editOwnOrder` /
 * `correctOrder` — the three entry points differ only in *what row they
 * write the effects against* and *how the §3.8 stock balance is measured*;
 * the line/price/payment rules and the actual `OrderLine` + `sale`
 * `StockMovement` + `MoneyMovement`/`Debt` writes are identical.
 */

const ACCOUNT_FOR_METHOD: Record<"cash" | "mpesa", MoneyAccount> = {
  cash: "cash",
  mpesa: "mpesa_bank",
};

/** A fully validated line, ready to write. */
export type ResolvedLine = {
  productId: string;
  quantity: Prisma.Decimal;
  /** Snapshotted selling price (ADR-16: "captured at time of sale"). */
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

export type ResolvedOrder = {
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  deliveryFee: Prisma.Decimal | null;
  customerId: string | null;
  account: MoneyAccount | null;
  occurredAt: Date;
  lines: ResolvedLine[];
  total: Prisma.Decimal;
};

type ValidateArgs = {
  input: CreateOrderInput;
  restaurantId: string;
  /**
   * Per-product quantity already on the ledger at the Restaurant that this
   * write is *replacing* (an edit / correction adds back its own existing
   * `sale` movements before comparing). Keyed by productId; a positive
   * number is units the replaced order had removed from stock.
   */
  replacingQtyByProduct?: Map<string, Prisma.Decimal>;
  tx: Prisma.TransactionClient;
};

/**
 * Validate the order in the documented order (S4 handoff §3), snapshot each
 * line's selling price, and run the §3.8 BLOCK against the *current* derived
 * Restaurant balance (read on `tx`), adding back any quantity this write is
 * replacing. Throws a `DomainError` on the first failure; the §3.8 check
 * names **every** short line.
 */
export async function validateOrder({
  input,
  restaurantId,
  replacingQtyByProduct,
  tx,
}: ValidateArgs): Promise<ResolvedOrder> {
  // 1. lines non-empty; each quantity > 0.
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "An order must have at least one line.",
      "lines",
    );
  }
  const quantities = input.lines.map((l) => toQuantity(l.quantity, "lines"));

  // 2. each product exists, is not soft-deleted, and is actively sold at
  //    the Restaurant with a selling price. Snapshot that price.
  const productIds = input.lines.map((l) => l.productId);
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      deletedAt: true,
      productLocations: {
        where: { locationId: restaurantId },
        select: { active: true, sellingPrice: true },
      },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const resolvedLines: ResolvedLine[] = input.lines.map((line, i) => {
    const product = byId.get(line.productId);
    if (!product || product.deletedAt !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `Product ${line.productId} does not exist.`,
        "lines",
      );
    }
    const pl = product.productLocations[0];
    if (!pl || !pl.active || pl.sellingPrice == null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `${product.name} is not sold at the Restaurant.`,
        "lines",
      );
    }
    const quantity = quantities[i];
    const unitPrice = pl.sellingPrice;
    return {
      productId: line.productId,
      quantity,
      unitPrice,
      subtotal: computeLineSubtotal(quantity, unitPrice),
    };
  });

  // 3. delivery fee rule.
  let deliveryFee: Prisma.Decimal | null = null;
  if (input.orderType === "delivery") {
    if (input.deliveryFee != null && input.deliveryFee !== "") {
      deliveryFee = toMoney(input.deliveryFee, "deliveryFee");
    }
  } else if (input.deliveryFee != null && input.deliveryFee !== "") {
    const fee = toMoney(input.deliveryFee, "deliveryFee");
    if (!fee.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Delivery fee is only allowed on a delivery order.",
        "deliveryFee",
      );
    }
  }

  // 4. credit ⇒ customerId required + exists; non-credit ⇒ customerId absent.
  let customerId: string | null = null;
  if (input.paymentMethod === "credit") {
    if (!input.customerId) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A credit order must be attached to a customer.",
        "customerId",
      );
    }
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new DomainError("NOT_FOUND", "Customer not found.", "customerId");
    }
    customerId = customer.id;
  } else if (input.customerId) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A customer can only be attached to a credit order.",
      "customerId",
    );
  }

  // account mapping for a cash / M-Pesa order (see types.ts). Derive from
  // paymentMethod; if the caller passed one, it must be consistent.
  let account: MoneyAccount | null = null;
  if (input.paymentMethod === "cash" || input.paymentMethod === "mpesa") {
    const derived = ACCOUNT_FOR_METHOD[input.paymentMethod];
    if (input.account && input.account !== derived) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `A ${input.paymentMethod} order cannot land in the ${input.account} account.`,
        "account",
      );
    }
    account = derived;
  } else if (input.account) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A credit order does not land in a money account.",
      "account",
    );
  }

  // 5. §3.8 BLOCK. Sum ordered quantity per distinct product, compare to the
  //    current derived Restaurant balance (read on `tx`), adding back any
  //    quantity this write replaces. Name EVERY short line. Write nothing.
  const orderedByProduct = new Map<string, Prisma.Decimal>();
  for (const rl of resolvedLines) {
    orderedByProduct.set(
      rl.productId,
      (orderedByProduct.get(rl.productId) ?? ZERO).add(rl.quantity),
    );
  }

  const distinctIds = [...orderedByProduct.keys()];
  const balances = await tx.stockMovement.groupBy({
    by: ["productId"],
    where: { productId: { in: distinctIds }, locationId: restaurantId },
    _sum: { quantity: true },
  });
  const balanceByProduct = new Map(
    balances.map((b) => [b.productId, b._sum.quantity ?? ZERO]),
  );

  const shortages: string[] = [];
  for (const [productId, ordered] of orderedByProduct) {
    const derived = balanceByProduct.get(productId) ?? ZERO;
    const available = derived.add(replacingQtyByProduct?.get(productId) ?? ZERO);
    if (ordered.greaterThan(available)) {
      const name = byId.get(productId)?.name ?? productId;
      shortages.push(`${name} (only ${available.toFixed(4)} in stock at the Restaurant)`);
    }
  }
  if (shortages.length > 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Not enough Restaurant stock: ${shortages.join("; ")}. Reduce the quantity or remove the line.`,
      "lines",
    );
  }

  const total = computeTotal(
    resolvedLines.map((l) => l.subtotal),
    deliveryFee,
  );

  return {
    orderType: input.orderType,
    paymentMethod: input.paymentMethod,
    deliveryFee,
    customerId,
    account,
    occurredAt: input.occurredAt ?? new Date(),
    lines: resolvedLines,
    total,
  };
}

/**
 * Write the `OrderLine`s, one negative `sale` `StockMovement` per line, and
 * exactly one of a `MoneyMovement` (cash / M-Pesa) or a `Debt` (credit),
 * for an order row that already exists. Used by `createOrder` and, after it
 * clears the old rows, `editOwnOrder`.
 */
export async function writeOrderEffects(
  tx: Prisma.TransactionClient,
  order: { id: string; locationId: string },
  resolved: ResolvedOrder,
  actorId: string,
): Promise<void> {
  for (const line of resolved.lines) {
    await tx.orderLine.create({
      data: {
        orderId: order.id,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        locationId: order.locationId,
        movementType: "sale",
        quantity: line.quantity.negated(), // stock leaves
        recordedById: actorId,
        occurredAt: resolved.occurredAt,
        orderId: order.id,
      },
    });
  }

  if (resolved.paymentMethod === "credit") {
    await recordDebt(
      {
        customerId: resolved.customerId as string,
        orderId: order.id,
        amount: resolved.total,
        occurredAt: resolved.occurredAt,
      },
      { tx },
    );
  } else {
    await recordMoneyMovement(
      {
        account: resolved.account as MoneyAccount,
        amount: resolved.total, // positive: money in
        sourceType: "order",
        sourceId: order.id,
        occurredAt: resolved.occurredAt,
      },
      { actorId, tx },
    );
  }
}
