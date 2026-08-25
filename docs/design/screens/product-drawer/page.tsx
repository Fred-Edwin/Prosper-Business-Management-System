"use client";

import * as React from "react";
import { Drawer } from "@/components/kit/drawer";
import { TextInput } from "@/components/kit/text-input";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { Button } from "@/components/kit/button";
import { InfoBanner } from "@/components/kit/banner";
import { productDrawerMock, type ProductKind } from "./mock-data";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-ui text-sm/sm font-semibold text-text-primary">{children}</p>;
}

export default function ProductDrawerScreen() {
  const [kind, setKind] = React.useState<ProductKind>(productDrawerMock.productKind);
  const [locations, setLocations] = React.useState(productDrawerMock.locations);

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-surface-subtle p-10">
      <Drawer
        open
        title={productDrawerMock.title}
        onClose={() => {}}
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Save Product</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SectionLabel>General Information</SectionLabel>
          <TextInput label="Product Name" placeholder={productDrawerMock.productNamePlaceholder} defaultValue={productDrawerMock.productName} />
          <div className="flex flex-col gap-2">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Product kind</span>
            <SegmentedControl
              options={[
                { value: "Ingredient", label: "Ingredient" },
                { value: "Dish", label: "Dish" },
                { value: "Goods", label: "Goods" },
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
          <TextInput label="Unit Label" placeholder={productDrawerMock.unitLabelPlaceholder} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Cost & Buying Price</SectionLabel>
          <div className="flex flex-col gap-2">
            <label className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Buying Price</label>
            <div className="flex h-9 items-center rounded-sm border border-solid border-border-strong bg-surface-page">
              <span className="flex h-full shrink-0 items-center border-r border-solid border-border-strong px-3 font-ui text-sm/sm text-text-secondary">
                KES
              </span>
              <input
                defaultValue={productDrawerMock.buyingPrice}
                className="min-w-0 grow border-none bg-transparent px-3 font-ui text-sm/sm text-text-primary outline-none"
              />
            </div>
          </div>
          <InfoBanner>{productDrawerMock.buyingPriceNote}</InfoBanner>
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Location Availability & Selling Prices</SectionLabel>
          {locations.map((loc, i) => (
            <div key={loc.key} className="flex items-center gap-3">
              <ToggleSwitch
                checked={loc.available}
                onChange={(v) =>
                  setLocations((prev) => prev.map((l, idx) => (idx === i ? { ...l, available: v } : l)))
                }
              />
              <span className="w-[90px] shrink-0 font-ui text-sm/sm text-text-primary">{loc.label}</span>
              {loc.sellingPrice !== null ? (
                <div className="flex h-8 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                  <span className="font-ui text-caption/caption text-text-secondary">KES</span>
                  <input defaultValue={loc.sellingPrice} className="w-16 border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none" />
                </div>
              ) : (
                <span className="font-ui text-sm/sm text-text-tertiary">Storage only — no selling price</span>
              )}
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
