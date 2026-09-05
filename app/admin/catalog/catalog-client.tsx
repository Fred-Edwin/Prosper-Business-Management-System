// /admin/catalog — the Admin catalog screen. Two tabs (Session 9C):
//
//   Products  — the M1 product CRUD (kind sub-tabs, search, drawer, delete).
//               VERBATIM from the previous single-file version, now in
//               ./products-tab.tsx.
//   Locations — locations CRUD (add / edit / deactivate). New this session;
//               closes the gap M1 left when it shipped locations read-only.
//
// The screen owns ONE <AdminPageHeader> (ADR-56) — title with a count
// badge + a primary "Add …" button — and the <Tabs> row directly under it.
// Each tab publishes its count + its create trigger up through `onState`
// (same pattern financials / staff use to drive a header button from the
// active tab). Tab bodies live in their own files, per the brief.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { Button } from "@/components/kit/button";
import { ProductsTab, type ProductsTabState } from "./products-tab";
import { LocationsTab, type LocationsTabState } from "./locations-tab";

type CatalogTabKey = "products" | "locations";

const TABS = [
  { key: "products" as const, label: "Products", panelId: "catalog-panel-products" },
  { key: "locations" as const, label: "Locations", panelId: "catalog-panel-locations" },
];

const VALID: readonly CatalogTabKey[] = ["products", "locations"];

const TITLE: Record<CatalogTabKey, string> = {
  products: "Product Catalog",
  locations: "Locations",
};
const ADD_LABEL: Record<CatalogTabKey, string> = {
  products: "Add Product",
  locations: "Add Location",
};

export function CatalogClient({
  initialTab = "products",
}: {
  initialTab?: CatalogTabKey;
}) {
  const [tab, setTab] = React.useState<CatalogTabKey>(
    VALID.includes(initialTab) ? initialTab : "products",
  );

  const changeTab = React.useCallback((key: string) => {
    setTab(
      VALID.includes(key as CatalogTabKey)
        ? (key as CatalogTabKey)
        : "products",
    );
  }, []);

  // Each tab reports { countLabel, openCreate } up here so the shared
  // header renders the right badge + wires the right "Add …" button.
  const [productsState, setProductsState] =
    React.useState<ProductsTabState | null>(null);
  const [locationsState, setLocationsState] =
    React.useState<LocationsTabState | null>(null);

  const active = tab === "products" ? productsState : locationsState;
  const countLabel = active?.countLabel ?? "";

  return (
    <PageShell>
      <AdminPageHeader
        title={
          <div className="flex items-center gap-(--sp-4) min-w-0">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1 truncate min-w-0">
              {TITLE[tab]}
            </div>
            {countLabel && (
              <div className="flex items-center h-[22px] px-(--sp-4) rounded-lg shrink-0 whitespace-nowrap [background-color:var(--surface-hover)]">
                <div className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
                  {countLabel}
                </div>
              </div>
            )}
          </div>
        }
        actions={
          <Button
            variant="primary"
            onClick={() => active?.openCreate()}
            disabled={!active}
          >
            {ADD_LABEL[tab]}
          </Button>
        }
      />

      <div className="flex flex-col grow gap-(--sp-8)">
        <Tabs
          tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={tab}
          onChange={changeTab}
          idBase="catalog-tabs"
        />

        {/* Both tabs stay mounted so their data / drawer state survives a
            tab switch; only the active one is shown. */}
        <div
          id="catalog-panel-products"
          role="tabpanel"
          aria-labelledby="catalog-tabs-tab-products"
          hidden={tab !== "products"}
          className="flex flex-col grow min-h-0"
        >
          <ProductsTab onState={setProductsState} />
        </div>
        <div
          id="catalog-panel-locations"
          role="tabpanel"
          aria-labelledby="catalog-tabs-tab-locations"
          hidden={tab !== "locations"}
          className="flex flex-col grow min-h-0"
        >
          <LocationsTab onState={setLocationsState} />
        </div>
      </div>
    </PageShell>
  );
}
