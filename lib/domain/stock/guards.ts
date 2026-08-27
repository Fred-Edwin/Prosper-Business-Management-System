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
