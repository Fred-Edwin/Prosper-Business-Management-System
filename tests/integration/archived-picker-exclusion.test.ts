// A5 (ADR-47 §3) — the integrity work.
//
// Archived products / assets must not be selectable in ANY stock-flow
// picker. Every one of those pickers fetches `GET /api/products`
// (or `GET /api/assets`) with NO `includeArchived` / `includeDeleted`
// param — the audit in the Session 16 handoff confirms none of them
// override the default. This test seeds one archived + one active record
// and drives the exact route handler each flow's picker calls, asserting
// the archived one is absent.
//
// Call sites covered (all funnel through the same fetch):
//   - issue / production / transfer (both ends) / non_sale_consumption
//     product pickers   (app/store-manager/*, app/canteen/* via
//     use-staff-stock.ts `stockApi.listProducts()` → GET /api/products)
//   - the Record Payment drawer product picker
//     (app/admin/financials/financials-client.tsx `stockApi.listProducts()`)
//   - the bulk opening-stock grid
//     (app/admin/stock/opening/opening-client.tsx `stockApi.listProducts()`)
//   - the mobile stock-levels views
//     (app/store-manager/stock/stock-levels-view.tsx `stockApi.listProducts()`)
//   - the asset condition-transition surface fetches assets the same way
//     (app/admin/assets/use-assets.ts `assetApi.listAssets()` → GET /api/assets)
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createProduct, archiveProduct } from "@/lib/domain/catalog";
import { createAsset } from "@/lib/domain/assets";
import { softDeleteAsset } from "@/lib/domain/assets";

const mockSession = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

const P = "__archived_picker_test__";

let activeProductId = "";
let archivedProductId = "";
let activeAssetId = "";
let archivedAssetId = "";
let storeLocationId = "";

beforeAll(async () => {
  await cleanup();
  const store = await prisma.location.create({
    data: { name: `${P} Store`, type: "store" },
  });
  storeLocationId = store.id;

  const active = await createProduct({
    name: `${P} Active Ingredient`,
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: "100",
    locations: [],
  });
  const archived = await createProduct({
    name: `${P} Archived Ingredient`,
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: "100",
    locations: [],
  });
  await archiveProduct(archived.id);
  activeProductId = active.id;
  archivedProductId = archived.id;

  const activeAsset = await createAsset({
    name: `${P} Active Asset`,
    locationId: store.id,
    purchaseDate: "2024-01-01",
    purchaseCost: "5000",
    condition: "Good",
  });
  const archivedAsset = await createAsset({
    name: `${P} Archived Asset`,
    locationId: store.id,
    purchaseDate: "2024-01-01",
    purchaseCost: "5000",
    condition: "Good",
  });
  await softDeleteAsset(archivedAsset.id);
  activeAssetId = activeAsset.id;
  archivedAssetId = archivedAsset.id;

  mockSession.current = {
    user: { id: `${P}-admin`, name: "admin", role: "admin", active: true },
    expires: "2999-01-01T00:00:00.000Z",
  };
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function cleanup() {
  await prisma.productLocation.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.product.deleteMany({ where: { name: { startsWith: P } } });
  await prisma.asset.deleteMany({ where: { name: { startsWith: P } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: P } } });
}

async function getProducts(query = "") {
  const { GET } = await import("@/app/api/products/route");
  const res = await GET(new NextRequest(`http://test/api/products${query}`));
  const body = (await res.json()) as { data: { id: string }[] };
  return body.data.map((p) => p.id);
}

async function getAssets(query = "") {
  const { GET } = await import("@/app/api/assets/route");
  const res = await GET(new NextRequest(`http://test/api/assets${query}`));
  const body = (await res.json()) as { data: { id: string }[] };
  return body.data.map((a) => a.id);
}

describe("archived records are excluded from every stock-flow picker", () => {
  // One assertion per flow — they all hit GET /api/products with no
  // includeArchived, so the same fetch is the picker for each.
  const FLOWS = [
    "issue (Store Manager)",
    "production (Store Manager)",
    "transfer — source (Store Manager)",
    "transfer — destination (Store Manager / Canteen)",
    "non_sale_consumption",
    "Record Payment drawer (Admin Financials)",
    "bulk opening-stock grid",
    "mobile stock-levels view",
  ];

  it.each(FLOWS)("%s product picker omits the archived product", async () => {
    const ids = await getProducts();
    expect(ids).toContain(activeProductId);
    expect(ids).not.toContain(archivedProductId);
  });

  it("asset condition-transition surface omits the archived asset", async () => {
    const ids = await getAssets();
    expect(ids).toContain(activeAssetId);
    expect(ids).not.toContain(archivedAssetId);
  });

  it("the Archived tab IS still able to see archived rows (the one caller that opts in)", async () => {
    const productIds = await getProducts("?includeArchived=true");
    expect(productIds).toContain(archivedProductId);
    const assetIds = await getAssets("?includeDeleted=true");
    expect(assetIds).toContain(archivedAssetId);
  });
});
