"use client";

// M4 S9B — Attendance tab of /admin/staff. Optimised for ~15 seconds/day:
// DEFAULT PRESENT, the Admin only flags exceptions (PRD §4.8). One
// <SegmentedControl> (Present / Absent) per staff member, no per-row save
// — a single "Save attendance" writes the day in one bulk call.
//
// The date being edited is a kit <DatePicker> in the header (backdatable,
// capped at today). "Mark all present" is a bulk RESET of the working set,
// not a save.
//
// Composed from the frozen kit: <SimpleTable> + <SegmentedControl> +
// <DatePicker> + <PillFilter> + <Button> + <Toast>.

import * as React from "react";
import {
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/kit/simple-table";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { PillFilter } from "@/components/kit/pill-filter";
import { Button } from "@/components/kit/button";
import { ErrorState } from "@/components/kit/error-state";
import { EmptyState } from "@/components/kit/empty-state";
import { useToast } from "@/components/kit/toast";
import type { StaffView } from "@/lib/domain/staff";
import { ROLE_LABEL } from "./format";
import { useAttendance, useLocations, useRoster } from "./use-staff";
import { StaffRequestError } from "./use-staff";

const PRESENT = "Present";
const ABSENT = "Absent";

function locationFilterOptions(
  locations: { id: string; name: string }[],
): { key: string; label: string }[] {
  return [
    { key: "all", label: "All locations" },
    ...locations.map((l) => ({ key: l.id, label: l.name })),
  ];
}

export type AttendanceControls = {
  markAllPresent: () => void;
  save: () => void;
  dirty: boolean;
  saving: boolean;
};

export function AttendanceTab({
  date,
  datePicker,
  registerControls,
}: {
  /** `YYYY-MM-DD` business date being marked (from the header <DatePicker>). */
  date: string;
  /** The header <DatePicker> element — rendered here on mobile, in the header on desktop. */
  datePicker: React.ReactNode;
  /** Publishes markAllPresent / save / dirty / saving to the shell. */
  registerControls: (c: AttendanceControls) => void;
}) {
  const { toast } = useToast();
  const { locations } = useLocations();
  const [locFilter, setLocFilter] = React.useState("all");

  // Attendance is for ACTIVE staff only (inactive are hidden from
  // attendance and pay — PRD §4.8).
  const { staff, loading: rosterLoading, error: rosterError, refresh: refreshRoster } =
    useRoster(locFilter === "all" ? null : locFilter);
  const active = React.useMemo(() => staff.filter((s) => s.active), [staff]);

  const {
    rows,
    loading: attLoading,
    error: attError,
    refresh: refreshAtt,
    saveBulk,
  } = useAttendance(date);

  // Working set: staffId → present. Seeded from the explicit rows (missing
  // = present), re-seeded whenever the date or the fetched rows change.
  const [working, setWorking] = React.useState<Record<string, boolean>>({});
  const explicit = React.useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of rows) m[r.staffId] = r.present;
    return m;
  }, [rows]);

  React.useEffect(() => {
    const seed: Record<string, boolean> = {};
    for (const s of active) seed[s.id] = explicit[s.id] ?? true;
    setWorking(seed);
  }, [active, explicit]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const presentOf = (id: string) => working[id] ?? true;
  const presentCount = active.filter((s) => presentOf(s.id)).length;
  const absentCount = active.length - presentCount;

  const dirty = React.useMemo(
    () => active.some((s) => presentOf(s.id) !== (explicit[s.id] ?? true)),
    [active, working, explicit],
  );

  function setOne(id: string, present: boolean) {
    setWorking((w) => ({ ...w, [id]: present }));
  }
  function markAllPresent() {
    setWorking(() => {
      const next: Record<string, boolean> = {};
      for (const s of active) next[s.id] = true;
      return next;
    });
  }

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Send every active staff member so a "back to present" also lands
      // (the upsert corrects a prior explicit absence).
      const entries = active.map((s) => ({
        staffId: s.id,
        present: presentOf(s.id),
      }));
      await saveBulk(entries);
      toast("Attendance saved", { tone: "success" });
    } catch (e) {
      setSaveError(
        e instanceof StaffRequestError
          ? e.message
          : "Couldn't save attendance. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const loading = rosterLoading || attLoading;

  // Publish the controls the shell header / mobile sticky bar drive. `save`
  // and `markAllPresent` are stable enough; re-register whenever dirty /
  // saving flip so the sticky bar's disabled state stays in sync.
  const saveRef = React.useRef(save);
  saveRef.current = save;
  const markRef = React.useRef(markAllPresent);
  markRef.current = markAllPresent;
  React.useEffect(() => {
    registerControls({
      markAllPresent: () => markRef.current(),
      save: () => void saveRef.current(),
      dirty,
      saving,
    });
  }, [registerControls, dirty, saving]);

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
      width: "w-[160px] shrink-0",
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
      key: "attendance",
      header: "Attendance",
      width: "w-[188px] shrink-0",
      render: (s) => (
        <SegmentedControl
          aria-label={`Attendance for ${s.name}`}
          options={[PRESENT, ABSENT]}
          value={presentOf(s.id) ? PRESENT : ABSENT}
          onChange={(v) => setOne(s.id, v === PRESENT)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col grow gap-(--sp-5) pt-(--sp-6)">
      {/* Mobile: date row (picker + Mark all present) under the tab strip. */}
      <div className="flex md:hidden items-center justify-between gap-(--sp-4) px-(--sp-6)">
        {datePicker}
        <Button variant="secondary" size="sm" onClick={markAllPresent}>
          Mark all present
        </Button>
      </div>

      {/* Summary strip + Location PillFilter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-(--sp-4) px-(--sp-6) md:px-0">
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading
            ? "Loading…"
            : `${presentCount} present · ${absentCount} absent · ${active.length} staff`}
        </div>
        <PillFilter
          options={locationFilterOptions(locations)}
          activeKey={locFilter}
          onChange={setLocFilter}
        />
      </div>

      {saveError && (
        <div role="alert" className="px-(--sp-6) md:px-0 font-ui text-danger text-sm/sm">
          {saveError}
        </div>
      )}

      {rosterError || attError ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load attendance"
            description={rosterError ?? attError ?? ""}
            onRetry={() => {
              void refreshRoster();
              void refreshAtt();
            }}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={active}
              rowKey={(s) => s.id}
              loading={loading && active.length === 0}
              emptyState={{
                title: "No active staff",
                description:
                  "Add staff on the Roster tab — they appear here to mark attendance.",
              }}
            />
          </div>

          <div className="flex md:hidden flex-col">
            {!loading && active.length === 0 && (
              <div className="p-(--sp-5)">
                <EmptyState
                  title="No active staff"
                  description="Add staff on the Roster tab — they appear here to mark attendance."
                />
              </div>
            )}
            {active.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-(--sp-4) p-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex flex-col grow min-w-0 gap-(--sp-1)">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                    {s.name}
                  </span>
                  <span className="font-ui [color:var(--text-tertiary)] text-sm/sm truncate">
                    {ROLE_LABEL[s.role] ?? s.role} · {s.locationName}
                  </span>
                </div>
                <div className="shrink-0 w-[150px]">
                  <SegmentedControl
                    aria-label={`Attendance for ${s.name}`}
                    options={[PRESENT, ABSENT]}
                    value={presentOf(s.id) ? PRESENT : ABSENT}
                    onChange={(v) => setOne(s.id, v === PRESENT)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop save action — the mobile one is the sticky bottom bar. */}
          <div className="hidden md:flex items-center justify-end gap-(--sp-4) pt-(--sp-2)">
            <Button
              variant="primary"
              onClick={save}
              disabled={!dirty || saving}
              loading={saving}
            >
              Save attendance
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
