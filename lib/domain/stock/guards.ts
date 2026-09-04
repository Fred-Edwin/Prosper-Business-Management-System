import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

type Tx = Prisma.TransactionClient;

/** Throw `NOT_FOUND` unless the product exists and is not soft-deleted. */
export async function assertProductExists(tx: Tx, productId: string): Promise<void> {
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true, deletedAt: true },
  });
  if (!p || p.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }
}

/** Throw `VALIDATION_ERROR` unless the product exists and is `kind = "dish"`. */
export async function assertProductIsDish(tx: Tx, productId: string): Promise<void> {
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true, kind: true, deletedAt: true },
  });
  if (!p || p.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }
  if (p.kind !== "dish") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Production can only be recorded for a Dish product.",
      "productId",
    );
  }
}

/** Throw `NOT_FOUND` unless the location exists. */
export async function assertLocationExists(
  tx: Tx,
  locationId: string,
  field = "locationId",
): Promise<void> {
  const l = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true },
  });
  if (!l) {
    throw new DomainError("NOT_FOUND", "Location not found.", field);
  }
}

/**
 * R1 — the product's `kind` must be allowed at the location's `type`
 * (ADR-67). Ingredients are stocked at the Store only; dishes and goods
 * are stocked at the Restaurant or Canteen only. Enforced here rather than
 * as a DB CHECK — the constraint spans three tables and `ProductLocation`
 * already models "sold here", not "stocked here".
 *
 * `field` picks which key the `VALIDATION_ERROR` points at — pass
 * `"productId"` at a call site where the product is the thing the user
 * chose wrongly, `"locationId"` where the location is. Defaults to
 * `"locationId"`.
 */
export async function assertKindAllowedAtLocation(
  tx: Tx,
  productId: string,
  locationId: string,
  field = "locationId",
): Promise<void> {
  const [product, location] = await Promise.all([
    tx.product.findUnique({
      where: { id: productId },
      select: { kind: true, deletedAt: true },
    }),
    tx.location.findUnique({
      where: { id: locationId },
      select: { type: true },
    }),
  ]);
  if (!product || product.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }
  if (!location) {
    throw new DomainError("NOT_FOUND", "Location not found.", "locationId");
  }

  if (product.kind === "ingredient" && location.type !== "store") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Ingredients are only stocked at the Store.",
      field,
    );
  }
  if (product.kind !== "ingredient" && location.type === "store") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "The Store holds ingredients only — dishes and goods are stocked at the Restaurant or Canteen.",
      field,
    );
  }
}

/**
 * R2 — a `transfer`'s endpoints must both be `restaurant` or `canteen`
 * (ADR-67). A transfer touching the Store on either side is rejected; the
 * Store issues stock to the kitchen instead. (`from !== to` is enforced by
 * the caller and stays.)
 */
export async function assertTransferLocations(
  tx: Tx,
  fromLocationId: string,
  toLocationId: string,
): Promise<void> {
  const [from, to] = await Promise.all([
    tx.location.findUnique({
      where: { id: fromLocationId },
      select: { type: true },
    }),
    tx.location.findUnique({
      where: { id: toLocationId },
      select: { type: true },
    }),
  ]);
  if (!from) {
    throw new DomainError("NOT_FOUND", "Location not found.", "fromLocationId");
  }
  if (!to) {
    throw new DomainError("NOT_FOUND", "Location not found.", "toLocationId");
  }
  const MSG =
    "Transfers move stock between the Restaurant and the Canteen. The Store issues stock to the kitchen instead.";
  if (from.type === "store") {
    throw new DomainError("VALIDATION_ERROR", MSG, "fromLocationId");
  }
  if (to.type === "store") {
    throw new DomainError("VALIDATION_ERROR", MSG, "toLocationId");
  }
}

/**
 * R3 — only a `dish` or `goods` product may be transferred (ADR-67). An
 * ingredient transfer is rejected — ingredients are issued from the Store.
 */
export async function assertTransferableKind(
  tx: Tx,
  productId: string,
): Promise<void> {
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { kind: true, deletedAt: true },
  });
  if (!p || p.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }
  if (p.kind === "ingredient") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Only dishes and goods can be transferred — ingredients are issued from the Store.",
      "productId",
    );
  }
}

/** Throw unless the location exists and is of the given type. */
export async function assertLocationOfType(
  tx: Tx,
  locationId: string,
  type: "restaurant" | "canteen" | "store",
  field = "locationId",
): Promise<void> {
  const l = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });
  if (!l) {
    throw new DomainError("NOT_FOUND", "Location not found.", field);
  }
  if (l.type !== type) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `This movement must target the ${type} location.`,
      field,
    );
  }
}
