import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";

const GET_ROLES: readonly Role[] = ["admin", "canteen_attendant"];

export type CanteenProductItem = {
  id: string;
  name: string;
  unitLabel: string;
  category: string | null;
  kind: string;
  sellingPrice: string | null;
  locationId: string;
};

/**
 * `GET /api/canteen/products` — lists all active products sold at the canteen
 * (active `ProductLocation` with non-null `sellingPrice` and non-deleted `Product`).
 *
 * Roles: `admin` (all canteens or ?locationId=), `canteen_attendant` (their assigned canteen).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(GET_ROLES);
  if (auth instanceof NextResponse) return auth;

  let locationId: string | null = null;
  if (auth.user.role === "canteen_attendant") {
    locationId = await resolveActorLocationId(auth.user.id);
    if (!locationId) {
      return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
    }
  } else {
    const sp = req.nextUrl.searchParams;
    locationId = sp.get("locationId") ?? null;
  }

  const productLocations = await prisma.productLocation.findMany({
    where: {
      active: true,
      sellingPrice: { not: null },
      product: { deletedAt: null },
      ...(locationId
        ? { locationId }
        : { location: { type: "canteen", active: true } }),
    },
    select: {
      locationId: true,
      sellingPrice: true,
      product: {
        select: {
          id: true,
          name: true,
          unitLabel: true,
          category: true,
          kind: true,
        },
      },
    },
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });

  const products: CanteenProductItem[] = productLocations.map((pl) => ({
    id: pl.product.id,
    name: pl.product.name,
    unitLabel: pl.product.unitLabel,
    category: pl.product.category,
    kind: pl.product.kind,
    sellingPrice: pl.sellingPrice ? pl.sellingPrice.toFixed(2) : null,
    locationId: pl.locationId,
  }));

  return ok(products);
}
