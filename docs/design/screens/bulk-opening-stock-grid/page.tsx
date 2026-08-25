"use client";

import * as React from "react";
import { AdminShell } from "@/components/shells/admin-shell";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { Tabs } from "@/components/kit/tabs";
import { BulkEntryGrid, BulkEntryValuationFooter } from "@/components/kit/bulk-entry-grid";
import { Button } from "@/components/kit/button";
import {
  bulkGridBreadcrumb,
  bulkGridInstructions,
  bulkGridTabs,
  bulkGridLocations,
  bulkGridRows,
  bulkGridValuationFooter,
  bulkGridValuationFooterTitle,
} from "./mock-data";

export default function BulkOpeningStockGridScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [rows, setRows] = React.useState(bulkGridRows);

  return (
    <AdminShell
      activeNavKey="stock"
      onNavigate={() => {}}
      toolbarTitle=""
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
    >
      <div className="flex items-center justify-between border-b border-solid border-border-subtle px-6 py-2">
        <Breadcrumb items={bulkGridBreadcrumb} />
        <div className="flex items-center gap-3">
          <Button variant="secondary">Discard & Back</Button>
          <Button variant="primary">Save Baseline & Initialize Day 1</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <InstructionalBanner
            step={bulkGridInstructions.step}
            title={bulkGridInstructions.title}
            description={bulkGridInstructions.description}
          />
          <span className="shrink-0 font-ui text-sm/sm font-medium text-text-secondary">{bulkGridInstructions.itemsCount}</span>
        </div>

        <Tabs items={bulkGridTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />

        <BulkEntryGrid
          locations={bulkGridLocations}
          rows={rows}
          onQuantityChange={(rowId, locationKey, value) =>
            setRows((prev) =>
              prev.map((r) => (r.id === rowId ? { ...r, quantities: { ...r.quantities, [locationKey]: value } } : r)),
            )
          }
        />

        <div className="flex flex-col gap-1">
          <span className="font-ui text-caption/caption font-medium text-text-secondary">{bulkGridValuationFooterTitle}</span>
          <BulkEntryValuationFooter items={bulkGridValuationFooter} />
        </div>
      </div>
    </AdminShell>
  );
}
