// Component Kit gallery — every components/kit/* component in every state / variant,
// sectioned and labelled by artboard id. Screenshot-comparison surface for the Session 3
// verbatim kit re-export (Phase B5) and the permanent visual reference for the kit.
//
// NOTE (Session 3, in progress): sections are being filled in as each artboard is
// transcribed. Sections still on the old hand-written APIs are commented out at the bottom
// and restored as their components land.
"use client";

import * as React from "react";

import { Button } from "@/components/kit/button";
import { IconButton } from "@/components/kit/icon-button";
import { TextInput } from "@/components/kit/text-input";
import { Textarea } from "@/components/kit/textarea";
import { Select } from "@/components/kit/select";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { SearchInput } from "@/components/kit/search-input";
import { DatePicker } from "@/components/kit/date-picker";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { Tabs } from "@/components/kit/tabs";
import { PillFilter } from "@/components/kit/pill-filter";
import { StatusChip } from "@/components/kit/status-chip";
import { ConditionChip } from "@/components/kit/condition-chip";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { DenseLedger, type LedgerRow } from "@/components/kit/dense-ledger";
import { Drawer } from "@/components/kit/drawer";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { ActionTileGrid } from "@/components/kit/action-tile-grid";
import { ActivityTimeline } from "@/components/kit/activity-timeline";
import { BottomNav } from "@/components/kit/bottom-nav";
import { FlowHeader } from "@/components/kit/flow-header";
import { DenseSummaryStrip } from "@/components/kit/dense-summary-strip";
import { TransferBanner, PurchaseDeliveryBanner } from "@/components/kit/banner";
import { MatchCard } from "@/components/kit/match-card";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { BulkEntryGrid, type BulkGridRow } from "@/components/kit/bulk-entry-grid";
import { BottomSheet, type BottomSheetState } from "@/components/kit/bottom-sheet";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-solid border-border-subtle pb-10">
      <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">
        {title} <span className="text-text-tertiary font-normal">({id})</span>
      </h2>
      {children}
    </section>
  );
}

function Case({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-ui text-caption/micro font-medium uppercase tracking-[0.04em] text-text-tertiary">
        {label}
      </div>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </div>
  );
}

const KIND_OPTIONS = [
  { value: "ingredient", label: "Ingredient" },
  { value: "dish", label: "Dish" },
  { value: "goods", label: "Goods" },
];

// ---- Simple Table sample (Assets) ----
interface AssetRow {
  name: string;
  location: string;
  date: string;
  cost: string;
  condition: "Good" | "Needs Repair" | "Decommissioned";
}

const assetColumns: SimpleTableColumn<AssetRow>[] = [
  { key: "name", header: "Asset name", width: "grow min-w-[200px]", cell: "strong", render: (r) => r.name },
  { key: "location", header: "Location", width: "w-[180px]", cell: "text", render: (r) => r.location },
  { key: "date", header: "Purchase date", width: "w-[160px]", cell: "mono", render: (r) => r.date },
  { key: "cost", header: "Cost basis", width: "w-[140px]", align: "right", cell: "mono", render: (r) => r.cost },
  { key: "condition", header: "Condition", width: "w-[140px]", render: (r) => <ConditionChip condition={r.condition} /> },
  { key: "edit", header: "Edit", width: "w-[50px]", cell: "accent", render: () => "Edit" },
];

const assetRows: AssetRow[] = [
  { name: "Commercial Deep Fryer Double", location: "Restaurant Kitchen", date: "Jan 15, 2025", cost: "45,000.00", condition: "Good" },
  { name: "Samsung Galaxy Tab A8 POS", location: "Restaurant Cashier", date: "Aug 12, 2025", cost: "28,000.00", condition: "Needs Repair" },
  { name: "400L Upright Commercial Chiller", location: "Store", date: "Nov 10, 2024", cost: "92,000.00", condition: "Good" },
  { name: "POS Receipt Printer", location: "Canteen Till", date: "Mar 3, 2023", cost: "6,500.00", condition: "Decommissioned" },
];

// ---- Dense Ledger sample ----
const dash = { dash: true } as const;
const ledgerRows: LedgerRow[] = [
  {
    id: "beef",
    product: "Beef Fillet (kg)",
    opening: { value: "25.0" },
    purchases: { value: "+50.0", tone: "success" },
    issues: { value: "-18.5", tone: "danger", corrected: true },
    production: dash,
    transferIn: dash,
    transferOut: { value: "-10.0", tone: "danger" },
    sold: dash,
    soldValue: dash,
    closing: { value: "46.5" },
    closingValue: { value: "27,900.00" },
  },
  {
    id: "rice",
    product: "Rice Basmati (kg)",
    opening: { value: "120.0" },
    purchases: dash,
    issues: { value: "-35.0", tone: "danger" },
    production: dash,
    transferIn: dash,
    transferOut: { value: "-15.0", tone: "danger" },
    sold: dash,
    soldValue: dash,
    closing: { value: "70.0" },
    closingValue: { value: "12,600.00" },
  },
  {
    id: "chicken",
    product: "Grilled Chicken (pcs)",
    opening: { value: "8.0" },
    purchases: dash,
    issues: dash,
    production: { value: "+40.0", tone: "success" },
    transferIn: { value: "+5.0", tone: "success" },
    transferOut: dash,
    sold: { value: "-38.0", tone: "danger" },
    soldValue: { value: "18,240.00", dash: false },
    closing: { value: "15.0" },
    closingValue: { value: "7,200.00" },
  },
];

const ledgerTotals = {
  label: "Totals (reconciled)",
  opening: { value: "153.0" },
  purchases: { value: "+50.0", tone: "success" as const },
  issues: { value: "-53.5", tone: "danger" as const },
  production: { value: "+40.0", tone: "success" as const },
  transferIn: { value: "+5.0", tone: "success" as const },
  transferOut: { value: "-25.0", tone: "danger" as const },
  sold: { value: "-38.0", tone: "danger" as const },
  soldValue: { value: "18,240.00" },
  closing: { value: "131.5" },
  closingValue: { value: "47,700.00" },
};

// ---- Date picker sample month ----
const AUG_2026 = [
  [
    { day: 17 }, { day: 18 }, { day: 19 }, { day: 20, today: true },
    { day: 21 }, { day: 22 }, { day: 23 },
  ],
  [
    { day: 24, selected: true }, { day: 25 }, { day: 26 }, { day: 27, disabled: true },
    { day: 28, disabled: true }, { day: 29, disabled: true }, { day: 30, disabled: true },
  ],
];

const bulkRows: BulkGridRow[] = [
  {
    id: "beef",
    item: "Beef Fillet",
    category: "Ingredient",
    categoryTone: "info",
    unit: "kg",
    store: { value: "25.0", editable: true },
    restaurant: { value: "0.0", editable: false },
    canteen: { value: "0.0", editable: false },
    costBuying: "580.00",
    totalValue: "14,500.00",
  },
  {
    id: "oil",
    item: "Cooking Oil  ·  cell error state",
    category: "Ingredient",
    categoryTone: "info",
    unit: "kg",
    store: { value: "-4.0", editable: true, error: true },
    restaurant: { value: "0.0", editable: false },
    canteen: { value: "0.0", editable: false },
    costBuying: "120.00",
    totalValue: "—",
  },
  {
    id: "chicken",
    item: "Grilled Chicken",
    category: "Dish (Finished)",
    categoryTone: "warning",
    unit: "pcs",
    store: { value: "0.0", editable: false },
    restaurant: { value: "8.0", editable: true },
    canteen: { value: "0.0", editable: false },
    costBuying: "0.00 (Dish)",
    totalValue: "0.00",
  },
];

export default function KitGalleryPage() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetState, setSheetState] = React.useState<BottomSheetState>("closed");

  return (
    <div className="flex flex-col gap-10 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-ui text-display/display font-semibold text-text-primary">Component Kit</h1>
        <p className="font-ui text-sm/sm text-text-secondary">
          Every kit component in every state, for side-by-side comparison with the Paper artboards.
          Verbatim get_jsx transcription (Session 3).
        </p>
      </header>

      <Section id="6BR-0" title="Buttons & Actions">
        <Case label="Variants">
          <Button variant="primary">Save changes</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="tertiary">View details</Button>
          <Button variant="destructive">Permanently delete</Button>
        </Case>
        <Case label="Disabled">
          <Button variant="primary" disabled>Save changes</Button>
          <Button variant="secondary" disabled>Cancel</Button>
          <Button variant="destructive" disabled>Permanently delete</Button>
        </Case>
        <Case label="Loading (primary / destructive)">
          <Button variant="primary" loading>Saving…</Button>
          <Button variant="destructive" loading>Deleting…</Button>
        </Case>
        <Case label="Icon button">
          <IconButton aria-label="Add" />
          <IconButton aria-label="Add" disabled />
        </Case>
      </Section>

      <Section id="6CG-0" title="Form Controls">
        <Case label="Text input (default / filled / error / disabled)">
          <TextInput label="Product name" placeholder="e.g. Beef Fillet" />
          <TextInput label="Product name" defaultValue="Beef Fillet" />
          <TextInput label="Product name" defaultValue="Beef Fille" error helperText="Product name is required." />
          <TextInput label="Buying price" defaultValue="0.00 KES" disabled />
        </Case>
        <Case label="Select (default / open on click / error / disabled)">
          <Select label="Category" options={KIND_OPTIONS} placeholder="Select…" />
          <Select label="Category" options={KIND_OPTIONS} defaultValue="ingredient" />
          <Select label="Location" options={KIND_OPTIONS} error helperText="Location is required." placeholder="Select a location…" />
          <Select label="Category" options={KIND_OPTIONS} defaultValue="ingredient" disabled />
        </Case>
        <Case label="Segmented control (resting / disabled)">
          <SegmentedControl label="Product kind" options={["Ingredient", "Dish", "Goods"]} defaultValue="Ingredient" />
          <SegmentedControl label="Product kind" options={["Ingredient", "Dish", "Goods"]} defaultValue="Ingredient" disabled />
        </Case>
        <Case label="Toggle switch (on / off / disabled)">
          <ToggleSwitch defaultChecked aria-label="A" />
          <ToggleSwitch aria-label="B" />
          <ToggleSwitch defaultChecked disabled aria-label="C" />
          <ToggleSwitch disabled aria-label="D" />
        </Case>
      </Section>

      <Section id="6WD-0" title="Utility & Layout">
        <Case label="Search input (default / filled with clear)">
          <SearchInput placeholder="Search products, movements…" />
          <SearchInput defaultValue="beef fillet" placeholder="Search products, movements…" />
        </Case>
        <Case label="Date picker (click to open calendar)">
          <DatePicker label="Date" value="Aug 24, 2026" monthLabel="August 2026" weeks={AUG_2026} />
        </Case>
        <Case label="Quantity stepper (default / at-min / error)">
          <QuantityStepper label="Issue Qty" value={70} unit="kg" step={0.5} format={(v) => v.toFixed(1)} />
          <QuantityStepper label="Issue Qty" value={0} min={0} unit="kg" format={(v) => v.toFixed(1)} />
          <QuantityStepper label="Issue Qty" value={999} unit="kg" error helperText="Value exceeds available stock." format={(v) => v.toFixed(1)} />
        </Case>
        <Case label="Textarea (default / error)">
          <Textarea label="Reason for adjustment" defaultValue="Kitchen chef requested additional 3.5kg after initial morning issue logged." />
          <Textarea label="Reason for adjustment" error helperText="Reason is required." />
        </Case>
        <Case label="Breadcrumb">
          <Breadcrumb items={[{ label: "Stock & Reconciliation", href: "#" }, { label: "Day 1 Initial Baseline Calibration" }]} />
        </Case>
        <Case label="Instructional banner (numbered)">
          <div className="w-[680px]">
            <InstructionalBanner
              step={1}
              title="Comprehensive Day 1 Inventory & Asset Calibration"
              body="Enter physical count quantities on site across all locations for raw ingredients, dishes, goods, and physical equipment."
            />
          </div>
        </Case>
        <Case label="Action-tile grid (badge / plain sub-label)">
          <ActionTileGrid
            tiles={[
              {
                label: "Receive Goods",
                subLabel: "1 Delivery Pending",
                badge: true,
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M21 8v13H3V8" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 3h22v5H1z" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="10" y1="12" x2="14" y2="12" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                label: "Issue to Kitchen",
                subLabel: "Raw ingredients",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <line x1="7" y1="17" x2="17" y2="7" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="7 7 17 7 17 17" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
            ]}
          />
        </Case>
        <Case label="Activity timeline (signed rows / empty)">
          <ActivityTimeline
            rows={[
              { title: "Beef Fillet (Store)", subtitle: "Issued to Kitchen · Chef Mike", value: "-18.5 kg", sign: "negative" },
              { title: "Grilled Chicken (Batch #4)", subtitle: "Cooked & prepped for Restaurant", value: "+40.0 pcs", sign: "positive" },
            ]}
          />
          <ActivityTimeline rows={[]} />
        </Case>
        <Case label="Bottom nav (active / inactive)">
          <BottomNav
            activeKey="hub"
            items={[
              {
                key: "hub",
                label: "Hub",
                activeIcon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                    <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                  </svg>
                ),
                inactiveIcon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                    <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                  </svg>
                ),
              },
              {
                key: "stock",
                label: "Stock",
                activeIcon: <span />,
                inactiveIcon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M20 7h-3V6a4 4 0 0 0-8 0v1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                    <path d="M9 7V6a3 3 0 0 1 6 0v1" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                  </svg>
                ),
              },
              {
                key: "history",
                label: "History",
                activeIcon: <span />,
                inactiveIcon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                  </svg>
                ),
              },
            ]}
          />
        </Case>
        <Case label="Flow header (with direction badge / title only)">
          <FlowHeader title="Flow Title" direction="Origin → Destination" />
          <FlowHeader title="Record Batch Production" />
        </Case>
        <Case label="Flow header — directionTone (info default / success / danger / warning)">
          <FlowHeader title="Transfer Stock" direction="Store → Canteen" directionTone="info" />
          <FlowHeader title="Record Batch Production" direction="Kitchen → Restaurant" directionTone="success" />
          <FlowHeader title="Issue Ingredients" direction="Store → Kitchen" directionTone="danger" />
          <FlowHeader title="Log Non-Sale" direction="Staff Meals & Spoilage" directionTone="warning" />
        </Case>
      </Section>

      <Section id="6IW-0" title="Tabs & Filters">
        <Case label="Underline tabs (active / inactive / disabled)">
          <Tabs
            tabs={[
              { key: "all", label: "All" },
              { key: "ing", label: "Ingredients" },
              { key: "dish", label: "Dishes" },
              { key: "goods", label: "Goods" },
              { key: "arch", label: "Archived", disabled: true },
            ]}
            activeKey="all"
          />
        </Case>
        <Case label="Pill filter (active / inactive)">
          <PillFilter
            options={[
              { key: "all", label: "All (3)" },
              { key: "store", label: "Store" },
              { key: "rest", label: "Restaurant" },
              { key: "canteen", label: "Canteen" },
            ]}
            activeKey="all"
          />
        </Case>
      </Section>

      <Section id="6DJ-0" title="Chips & Status">
        <Case label="Status chip (semantic variants)">
          <StatusChip variant="success">Matched</StatusChip>
          <StatusChip variant="warning">Pending</StatusChip>
          <StatusChip variant="danger">Short</StatusChip>
          <StatusChip variant="info">Awaiting receipt</StatusChip>
          <StatusChip variant="neutral">Closed</StatusChip>
        </Case>
        <Case label="Condition chip">
          <ConditionChip condition="Good" />
          <ConditionChip condition="Needs Repair" />
          <ConditionChip condition="Decommissioned" />
        </Case>
      </Section>

      <Section id="6ET-0" title="Tables">
        <Case label="Simple table (row hover on hover; row click opens drawer)">
          <div className="w-full">
            <SimpleTable columns={assetColumns} rows={assetRows} rowKey={(r) => r.name} onRowClick={() => {}} />
          </div>
        </Case>
        <Case label="Dense ledger (corrected cell = underlined semantic colour; sticky footer; empty)">
          <div className="w-full overflow-x-auto">
            <DenseLedger rows={ledgerRows} totals={ledgerTotals} onCellClick={() => {}} />
          </div>
          <div className="w-full overflow-x-auto">
            <DenseLedger rows={[]} />
          </div>
        </Case>
        <Case label="Dense ledger — showLocation + horizontalScroll (ADR-37a; Admin Stock ledger screens)">
          <div className="w-full overflow-x-auto">
            <DenseLedger
              rows={ledgerRows.map((r, i) => ({
                ...r,
                location: ["Store", "Store", "Restaurant"][i] ?? "Store",
              }))}
              totals={ledgerTotals}
              showLocation
              horizontalScroll
              onCellClick={() => {}}
            />
          </div>
        </Case>
      </Section>

      <Section id="6OE-0" title="Drawers & Dialogs">
        <Case label="Edit drawer (open / close, focus trap, Esc)">
          <Button onClick={() => setDrawerOpen(true)}>Open edit drawer</Button>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Edit Asset"
            footer={
              <>
                <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button onClick={() => setDrawerOpen(false)}>Save changes</Button>
              </>
            }
          >
            <TextInput label="Asset name" defaultValue="Commercial Deep Fryer Double" />
            <Select label="Location" options={KIND_OPTIONS} defaultValue="ingredient" />
            <SegmentedControl
              label="Condition"
              options={["Good", "Needs Repair", "Decommissioned"]}
              defaultValue="Good"
            />
          </Drawer>
        </Case>
        <Case label="Drawer — rail variant (ADR-37b; docked right-edge, Admin Stock correction / Financials payment)">
          <div className="flex h-[560px] justify-end bg-[var(--surface-raised)]">
            <Drawer
              open
              onClose={() => {}}
              title="Adjust Row Movements"
              subtitle="Store · Beef Fillet (kg) · Aug 24"
              variant="rail"
              footer={
                <>
                  <Button variant="secondary">Close</Button>
                  <Button className="grow">Confirm &amp; Save Correction</Button>
                </>
              }
            >
              <div className="font-ui text-sm/sm text-text-secondary">
                Docked 420px rail: border-l, no radius, --surface-subtle footer. Body children
                are supplied by the screen (context rows, the correction field, a
                CalculatedImpactBanner, a Reason box).
              </div>
            </Drawer>
          </div>
        </Case>
        <Case label="Friction delete dialog (pending → confirmed; retype-mismatch)">
          <Button variant="destructive" onClick={() => setDialogOpen(true)}>Open delete dialog</Button>
          <FrictionDeleteDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onConfirm={() => setDialogOpen(false)}
            recordName="Commercial Deep Fryer Double"
          />
        </Case>
      </Section>

      <Section id="6R4-0" title="Stat Tiles & KPI">
        <Case label="Dense summary strip (toned values; flush = ledger footer)">
          <div className="w-full">
            <DenseSummaryStrip
              items={[
                { label: "Good:", value: "16" },
                { label: "Needs Repair:", value: "1", tone: "warning" },
                { label: "Decommissioned:", value: "1", tone: "danger" },
                { label: "Total Cost Basis:", value: "KES 482,500.00", alignEnd: true },
              ]}
            />
          </div>
        </Case>
        <p className="font-ui text-caption/micro text-text-tertiary">
          Stat tile row (the 4-tile KPI strip on 6R7-0) is Milestone 3 per milestone-1-plan.md §2 —
          deliberately NOT built this session.
        </p>
      </Section>

      <Section id="6SB-0" title="Banners & Cards">
        <Case label="Transfer banner (pinned / flagged)">
          <div className="w-[440px]">
            <TransferBanner
              title="Incoming Transfer from Store"
              detail="48.0 pcs Soda 300ml · dispatched 10m ago"
              primaryLabel="Accept Delivery (+48 pcs)"
            />
          </div>
          <div className="w-[440px]">
            <TransferBanner
              title="Transfer Flagged — awaiting admin review"
              detail="48.0 pcs Soda 300ml · you flagged a variance 2m ago"
              flagged
            />
          </div>
        </Case>
        <Case label="Purchase delivery banner (info / blue)">
          <div className="w-[440px]">
            <PurchaseDeliveryBanner
              title="Purchase Delivery Pending"
              detail="100.0 kg Rice Basmati · Nairobi Grains Millers · paid 2h ago"
              primaryLabel="Match Delivery (+100 kg)"
            />
          </div>
        </Case>
        <Case label="Match card (awaiting / matched / flagged)">
          <div className="w-[440px]">
            <MatchCard
              supplier="Farmer's Choice Butchery"
              details={["Product: Beef Fillet", "Expected Qty: 50.0 kg", "Paid Amount: KES 29,000.00 (Cash)"]}
              status="awaiting"
              actionLabel="1-Tap Match & Receive (+50.0 kg)"
            />
          </div>
          <div className="w-[440px]">
            <MatchCard
              supplier="Farmer's Choice Butchery"
              details={["Product: Beef Fillet", "Expected Qty: 50.0 kg", "Paid Amount: KES 29,000.00 (Cash)"]}
              status="matched"
              resultLabel="Matched & received  ·  +50.0 kg"
            />
          </div>
          <div className="w-[440px]">
            <MatchCard
              supplier="Farmer's Choice Butchery"
              details={["Product: Beef Fillet", "Expected Qty: 50.0 kg  ·  Received: 46.0 kg", "Paid Amount: KES 29,000.00 (Cash)"]}
              status="flagged"
              resultLabel="Variance flagged  ·  awaiting review"
            />
          </div>
        </Case>
        <Case label="Calculated impact banner (amber consequence preview)">
          <div className="w-[600px]">
            <CalculatedImpactBanner>
              Calculated Impact: Modifying issue from 15.0kg → 18.5kg applies a -3.50 kg delta,
              reducing Store Closing Stock to 46.50 kg (KES 27,900.00).
            </CalculatedImpactBanner>
          </div>
        </Case>
      </Section>

      <Section id="6TT-0" title="Bulk Entry Grid">
        <Case label="Editable cells (default / focused / non-editable / error) + valuation footer">
          <div className="w-full overflow-x-auto">
            <BulkEntryGrid
              rows={bulkRows}
              footerTitle="Consolidated Day 1 Valuation"
              footerSegments={[
                { label: "Raw Stock:", value: "KES 46,100" },
                { label: "Dishes:", value: "8 pcs" },
                { label: "Assets Basis:", value: "KES 137,000" },
                { label: "Consolidated:", value: "KES 188,140.00", tone: "success" },
              ]}
            />
          </div>
        </Case>
      </Section>

      <Section id="6Z4-0" title="Bottom Sheet">
        <Case label="Peek → open (drag down / Esc / backdrop to close)">
          <Button onClick={() => setSheetState("peek")}>Open bottom sheet (peek)</Button>
          <BottomSheet
            state={sheetState}
            onStateChange={setSheetState}
            title="Add product"
            peekContent={
              <>
                <div className="flex items-center justify-between">
                  <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    Grace Wanjiru — balance
                  </div>
                </div>
                <div className="font-mono font-(--weight-semibold) text-danger text-h1/h2">-KES 1,200</div>
              </>
            }
          >
            <div className="p-(--sp-6) font-ui text-sm/sm text-text-secondary">
              Full-task content goes here.
            </div>
          </BottomSheet>
        </Case>
      </Section>

      <Section id="9U3-0" title="Empty & Error States">
        <Case label="EmptyState (default / filtered) + ErrorState">
          <div className="w-[320px]">
            <EmptyState
              title="No assets yet"
              description="Add equipment and furniture to start tracking condition across locations."
              actionLabel="Add asset"
            />
          </div>
          <div className="w-[320px]">
            <EmptyState
              variant="filtered"
              title="No matches"
              description="No records match the current search and filters."
              actionLabel="Clear filters"
            />
          </div>
          <div className="w-[320px]">
            <ErrorState onRetry={() => {}} />
          </div>
        </Case>
      </Section>

      <p className="font-ui text-caption/micro text-text-tertiary">
        The four shells (admin-shell, staff-shell, mobile-shell-admin, mobile-nav-drawer),
        real-route rewiring, and the full tsc / smoke-check / doc updates are handed off to a
        follow-up session — see docs/PROGRESS.md.
      </p>
    </div>
  );
}
