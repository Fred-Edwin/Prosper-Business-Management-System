"use client";

import * as React from "react";
import { Drawer } from "@/components/kit/drawer";
import { TextInput } from "@/components/kit/text-input";
import { Select } from "@/components/kit/select";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { DatePicker } from "@/components/kit/date-picker";
import { Textarea } from "@/components/kit/textarea";
import { Button } from "@/components/kit/button";
import { assetDrawerMock, assetConditionOptions } from "./mock-data";
import type { AssetCondition } from "@/components/kit/condition-chip";

export default function AssetDrawerScreen() {
  const [condition, setCondition] = React.useState<AssetCondition>(assetDrawerMock.condition);

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-surface-subtle p-10">
      <Drawer
        open
        title={assetDrawerMock.title}
        onClose={() => {}}
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Save Asset</Button>
          </>
        }
      >
        <TextInput label="Asset name" defaultValue={assetDrawerMock.assetName} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Category *</span>
            <button type="button" className="font-ui text-caption/caption font-medium text-accent outline-none">
              + Add Category
            </button>
          </div>
          <Select defaultValue={assetDrawerMock.category}>
            <option>{assetDrawerMock.category}</option>
          </Select>
        </div>

        <Select label="Location" defaultValue={assetDrawerMock.location}>
          <option>{assetDrawerMock.location}</option>
        </Select>

        <div className="flex flex-col gap-2">
          <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Condition</span>
          <SegmentedControl options={assetConditionOptions} value={condition} onChange={setCondition} />
        </div>

        <div className="flex gap-3">
          <div className="grow">
            <DatePicker label="Purchase Date" value={assetDrawerMock.purchaseDate} displayValue={assetDrawerMock.purchaseDate} onChange={() => {}} />
          </div>
          <div className="grow">
            <label className="flex flex-col gap-2">
              <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Cost Basis (KES) *</span>
              <div className="flex h-9 items-center rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                <input defaultValue={assetDrawerMock.costBasis} className="min-w-0 grow border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none" />
              </div>
            </label>
          </div>
        </div>

        <Textarea label={assetDrawerMock.maintenanceNotesLabel} defaultValue={assetDrawerMock.maintenanceNotes} rows={3} />
      </Drawer>
    </div>
  );
}
