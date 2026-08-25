"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Tabs } from "@/components/kit/tabs";
import { Select } from "@/components/kit/select";
import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/kit/button";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { catalogFilterTabs, catalogProductCount, catalogProducts, type CatalogProductRow } from "./mock-data";

const money = (value: string | null) => (value === null ? "—" : value);

const columns: SimpleTableColumn<CatalogProductRow>[] = [
  { key: "name", header: "Name", grow: true, render: (r) => r.name },
  { key: "category", header: "Category", width: 100, render: (r) => r.category },
  { key: "unit", header: "Unit", width: 70, render: (r) => r.unit },
  { key: "buyingPrice", header: "Buying Price", width: 120, align: "right", mono: true, render: (r) => money(r.buyingPrice) },
  { key: "restaurantPrice", header: "Restaurant", width: 110, align: "right", mono: true, render: (r) => money(r.restaurantPrice) },
  { key: "canteenPrice", header: "Canteen", width: 110, align: "right", mono: true, render: (r) => money(r.canteenPrice) },
  { key: "storePrice", header: "Store", width: 110, align: "right", mono: true, render: (r) => money(r.storePrice) },
];

export default function AdminCatalogProductCatalogScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-ui text-display/display font-semibold text-text-primary">Product Catalog</h2>
          <span className="font-ui text-sm/sm text-text-secondary">{catalogProductCount}</span>
        </div>
        <Button variant="primary">
          <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
          Add Product
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Tabs items={catalogFilterTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />
        <div className="flex items-center gap-3">
          <Select defaultValue="all-locations" className="w-[140px]">
            <option value="all-locations">All Locations</option>
            <option value="restaurant">Restaurant</option>
            <option value="canteen">Canteen</option>
            <option value="store">Store</option>
          </Select>
          <SearchInput placeholder="Search products…" className="w-[240px]" />
        </div>
      </div>

      <SimpleTable
        columns={columns}
        rows={catalogProducts}
        rowKey={(r) => r.id}
        onEdit={() => {
          /* TODO(mock): open Product Drawer — Create/Edit */
        }}
      />
    </div>
  );
}
