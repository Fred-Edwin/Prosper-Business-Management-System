"use client";

// M4 S9B — Roster tab of /admin/staff. Count line + Location <PillFilter>
// sub-toolbar, then a <SimpleTable> (desktop) / cards (mobile). The whole
// row opens the add/edit <Drawer>. Composed from the frozen kit, following
// app/admin/financials/expenses-tab.tsx.
//
// Status is PLAIN COLORED TEXT, no chip (design-principles §4.4).

import * as React from "react";
import {
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/kit/simple-table";
import { PillFilter } from "@/components/kit/pill-filter";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { StaffView } from "@/lib/domain/staff";
import { ROLE_LABEL, money } from "./format";
import { StaffDrawer } from "./staff-drawer";
import { useLocations, useRoster } from "./use-staff";

function locationFilterOptions(
  locations: { id: string; name: string }[],
): { key: string; label: string }[] {
  return [
    { key: "all", label: "All locations" },
    ...locations.map((l) => ({ key: l.id, label: l.name })),
  ];
}

function StatusText({ active }: { active: boolean }) {
  return (
    <span
      className={`font-ui text-sm/sm ${
        active ? "text-success" : "[color:var(--text-tertiary)]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const CHEVRON = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <polyline
      points="9 18 15 12 9 6"
      fill="none"
      stroke="var(--text-tertiary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function RosterTab({
  registerAddStaff,
}: {
  /** Publishes the "open the add-staff drawer" trigger to the shell header. */
  registerAddStaff: (fn: () => void) => void;
}) {
  const { locations } = useLocations();
  const [locFilter, setLocFilter] = React.useState("all");
  const { staff, loading, error, refresh, create, update, deactivate } =
    useRoster(locFilter === "all" ? null : locFilter);

  const [drawer, setDrawer] = React.useState<
    { mode: "create" } | { mode: "edit"; target: StaffView } | null
  >(null);

  React.useEffect(() => {
    registerAddStaff(() => setDrawer({ mode: "create" }));
  }, [registerAddStaff]);

  const activeCount = staff.filter((s) => s.active).length;

  const columns: SimpleTableColumn<StaffView>[] = [
    {
      key: "name",
      header: "Name",
      width: "grow basis-0 min-w-[160px]",
      render: (s) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          {s.name}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "w-[150px] shrink-0",
      render: (s) => (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {ROLE_LABEL[s.role] ?? s.role}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      width: "w-[140px] shrink-0",
      render: (s) => (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {s.locationName}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Daily rate (KES)",
      width: "w-[150px] shrink-0",
      align: "right",
      cell: "mono",
      render: (s) => money(s.dailyRate),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[96px] shrink-0",
      render: (s) => <StatusText active={s.active} />,
    },
    {
      key: "chevron",
      header: "",
      width: "w-[24px] shrink-0",
      align: "right",
      render: () => CHEVRON,
    },
  ];

  return (
    <div className="flex flex-col grow gap-(--sp-5) pt-(--sp-6)">
      {/* Sub-toolbar: count line + Location PillFilter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-(--sp-4) px-(--sp-6) md:px-0">
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading
            ? "Loading…"
            : `${staff.length} staff · ${activeCount} active`}
        </div>
        <PillFilter
          options={locationFilterOptions(locations)}
          activeKey={locFilter}
          onChange={setLocFilter}
        />
      </div>

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load staff"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={staff}
              rowKey={(s) => s.id}
              rowLabel={(s) => `Edit ${s.name}`}
              onRowClick={(s) => setDrawer({ mode: "edit", target: s })}
              loading={loading && staff.length === 0}
              emptyState={{
                title: "No staff yet",
                description:
                  "Add your team members here — each gets a login PIN you set.",
                actionLabel: "Add staff",
                onAction: () => setDrawer({ mode: "create" }),
              }}
            />
          </div>

          <div className="flex md:hidden flex-col">
            {!loading && staff.length === 0 && (
              <div className="p-(--sp-5)">
                <EmptyState
                  title="No staff yet"
                  description="Add your team members here — each gets a login PIN you set."
                  actionLabel="Add staff"
                  onAction={() => setDrawer({ mode: "create" })}
                />
              </div>
            )}
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDrawer({ mode: "edit", target: s })}
                aria-label={`Edit ${s.name}`}
                className="flex items-center gap-(--sp-4) p-(--sp-5) text-left border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-interactive"
              >
                <div className="flex flex-col grow min-w-0 gap-(--sp-1)">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                    {s.name}
                  </span>
                  <span className="font-ui [color:var(--text-tertiary)] text-sm/sm truncate">
                    {ROLE_LABEL[s.role] ?? s.role} · {s.locationName}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-(--sp-1)">
                  <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                    KES {money(s.dailyRate)}
                  </span>
                  <StatusText active={s.active} />
                </div>
                <span className="shrink-0">{CHEVRON}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {drawer && (
        <StaffDrawer
          mode={drawer.mode}
          target={drawer.mode === "edit" ? drawer.target : undefined}
          locations={locations}
          onCreate={create}
          onUpdate={update}
          onDeactivate={deactivate}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
