"use client";

// M4 S9B — Pay & advances tab of /admin/staff. Per staff member for the
// selected month (header month picker). Composed from the frozen kit,
// borrowing the /admin/financials language: <SimpleTable> head/row
// treatment + a DARK totals-footer row (same as the Financials sticky
// footer) + the Location <PillFilter> + <Button>.
//
// KEY RULES (PRD §4.8):
//   gross = dailyRate × daysPresent   (derived from Attendance)
//   net   = gross − advances − deductions.  NOTHING ELSE.
//   netPay is NOT floored — it can be negative when advances exceed
//   earnings; the row renders that honestly and the "Pay out" action is
//   unavailable in that state.
//   Handover shortfalls are shown in a SEPARATE block below (ShortfallsCard),
//   never a pay column.

import * as React from "react";
import {
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/kit/simple-table";
import { PillFilter } from "@/components/kit/pill-filter";
import { Button } from "@/components/kit/button";
import { ErrorState } from "@/components/kit/error-state";
import { EmptyState } from "@/components/kit/empty-state";
import { useToast } from "@/components/kit/toast";
import type { StaffPay } from "@/lib/domain/staff";
import { ROLE_LABEL, money, negMoney, shortDate } from "./format";
import { monthLabel } from "./month-picker";
import { AdvanceDrawer } from "./advance-drawer";
import { PayoutDrawer } from "./payout-drawer";
import { ShortfallsCard } from "./shortfalls-card";
import {
  useLocations,
  useMonthlyShortfalls,
  usePayroll,
  useRoster,
} from "./use-staff";
import { StaffRequestError } from "./use-staff";

function locationFilterOptions(
  locations: { id: string; name: string }[],
): { key: string; label: string }[] {
  return [
    { key: "all", label: "All locations" },
    ...locations.map((l) => ({ key: l.id, label: l.name })),
  ];
}

function PayoutCell({
  row,
  onPay,
}: {
  row: StaffPay;
  onPay: (row: StaffPay) => void;
}) {
  if (row.paid && row.payout) {
    return (
      <span className="font-ui text-success text-sm/sm">
        Paid · {shortDate(row.payout.date)}
      </span>
    );
  }
  const netPositive = Number(row.netPay) > 0;
  return (
    <span className="flex items-center gap-(--sp-4)">
      <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">
        Unpaid
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={!netPositive}
        onClick={() => onPay(row)}
      >
        Pay out
      </Button>
    </span>
  );
}

export function PayTab({
  month,
  today,
  registerRecordAdjustment,
}: {
  /** `YYYY-MM`. */
  month: string;
  /** Africa/Nairobi today. */
  today: string;
  /** Publishes the "open the advance/deduction drawer" trigger to the shell. */
  registerRecordAdjustment: (fn: () => void) => void;
}) {
  const { toast } = useToast();
  const { locations } = useLocations();
  const [locFilter, setLocFilter] = React.useState("all");

  const { payroll, loading, error, refresh, recordAdjustment, payOne, payAll } =
    usePayroll(month);

  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  React.useEffect(() => {
    registerRecordAdjustment(() => setAdvanceOpen(true));
  }, [registerRecordAdjustment]);
  const { shortfalls, loading: sfLoading } = useMonthlyShortfalls(month);
  // The full roster: joins the role + location the design's row caption
  // needs (StaffPay carries neither), and drives the location filter.
  const { staff: roster } = useRoster(null);
  const byId = React.useMemo(
    () => new Map(roster.map((s) => [s.id, s])),
    [roster],
  );

  const rows = React.useMemo(() => {
    const all = payroll?.rows ?? [];
    if (locFilter === "all") return all;
    return all.filter((r) => byId.get(r.staffId)?.locationId === locFilter);
  }, [payroll, locFilter, byId]);

  const rowCaption = React.useCallback(
    (r: StaffPay): string => {
      const s = byId.get(r.staffId);
      if (s) return `${ROLE_LABEL[s.role] ?? s.role} · ${s.locationName}`;
      return `${r.daysPresent} of ${r.payableDays} days present`;
    },
    [byId],
  );

  const [drawer, setDrawer] = React.useState<StaffPay | null>(null);
  const [payingAll, setPayingAll] = React.useState(false);

  const totals = payroll?.totals;

  async function handlePayAll() {
    if (payingAll || !totals || totals.unpaidCount === 0) return;
    setPayingAll(true);
    try {
      const res = await payAll({
        month,
        paidFromAccount: "cash",
        date: today,
      });
      const paidN = res.paid.length;
      const skipN = res.skipped.length;
      toast(
        `Paid ${paidN} staff${skipN ? ` · ${skipN} skipped` : ""}`,
        { tone: paidN > 0 ? "success" : "info" },
      );
    } catch (e) {
      toast(
        e instanceof StaffRequestError
          ? e.code === "FORBIDDEN"
            ? "That date falls on a closed day."
            : e.message
          : "Couldn't run the batch payout.",
        { tone: "danger" },
      );
    } finally {
      setPayingAll(false);
    }
  }

  const columns: SimpleTableColumn<StaffPay>[] = [
    {
      key: "staff",
      header: "Staff member",
      width: "grow basis-0 min-w-[180px]",
      render: (r) => (
        <div className="flex flex-col gap-(--sp-1)">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            {r.staffName}
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {rowCaption(r)}
          </span>
        </div>
      ),
    },
    {
      key: "days",
      header: "Days",
      width: "w-[64px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => String(r.daysPresent),
    },
    {
      key: "rate",
      header: "Daily rate",
      width: "w-[92px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => money(r.dailyRate),
    },
    {
      key: "gross",
      header: "Gross pay",
      width: "w-[108px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => (
        <span className="[color:var(--text-primary)]">{money(r.grossPay)}</span>
      ),
    },
    {
      key: "advances",
      header: "Advances",
      width: "w-[100px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => (
        <span className="[color:var(--text-secondary)]">{negMoney(r.advances)}</span>
      ),
    },
    {
      key: "deductions",
      header: "Deductions",
      width: "w-[100px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => (
        <span className="[color:var(--text-secondary)]">
          {negMoney(r.deductions)}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net pay",
      width: "w-[116px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => {
        const n = Number(r.netPay);
        return (
          <span
            className={`font-(--weight-medium) ${
              n < 0 ? "text-danger" : "[color:var(--text-primary)]"
            }`}
          >
            {n < 0 ? "− " : ""}
            {money(Math.abs(n).toFixed(2))}
          </span>
        );
      },
    },
    {
      key: "payout",
      header: "Payout",
      width: "w-[150px] shrink-0",
      render: (r) => <PayoutCell row={r} onPay={setDrawer} />,
    },
  ];

  return (
    <div className="flex flex-col grow pt-(--sp-6)">
      {/* Sub-toolbar: summary line + Pay out all unpaid + Location PillFilter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-(--sp-4) px-(--sp-6) md:px-0 mb-(--sp-5)">
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading || !totals
            ? "Loading…"
            : `${monthLabel(month)} · ${totals.paidCount} of ${
                totals.paidCount + totals.unpaidCount
              } paid · KES ${money(totals.netUnpaid)} to pay`}
        </div>
        <div className="flex items-center gap-(--sp-4)">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePayAll}
            loading={payingAll}
            disabled={!totals || totals.unpaidCount === 0 || payingAll}
          >
            Pay out all unpaid
          </Button>
          <PillFilter
            options={locationFilterOptions(locations)}
            activeKey={locFilter}
            onChange={setLocFilter}
          />
        </div>
      </div>

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load payroll"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : (
        <>
          {/* Desktop table + dark totals footer */}
          <div className="hidden md:flex flex-col overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.staffId}
              loading={loading && rows.length === 0}
              emptyState={{
                title: "No staff to pay",
                description:
                  "Active staff appear here once added on the Roster tab.",
              }}
            />
            {totals && rows.length > 0 && (
              // Geometry mirrors the <SimpleTable> row above EXACTLY
              // (px-(--sp-6) + gap-(--sp-6), same column widths) so every
              // figure sits under its header. Weight is medium, not
              // semibold — a quiet summary band, not a shout.
              <div className="flex items-center h-[48px] px-(--sp-6) gap-(--sp-6) [background-color:var(--color-gray-900)] rounded-b-sm">
                <div className="grow basis-0 min-w-[180px] font-ui font-(--weight-medium) text-(--nav-text-strong) text-sm/sm">
                  {rows.length} staff
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="w-[92px] shrink-0" />
                <div className="w-[108px] shrink-0 text-right font-mono text-(--nav-text-strong) text-sm/sm">
                  {money(totals.grossPay)}
                </div>
                <div className="w-[100px] shrink-0 text-right font-mono text-(--nav-text-subtle) text-sm/sm">
                  {negMoney(totals.advances)}
                </div>
                <div className="w-[100px] shrink-0 text-right font-mono text-(--nav-text-subtle) text-sm/sm">
                  {negMoney(totals.deductions)}
                </div>
                <div className="w-[116px] shrink-0 text-right font-mono font-(--weight-medium) text-(--nav-text-active) text-sm/sm">
                  {money(totals.netPay)}
                </div>
                <div className="w-[150px] shrink-0 flex flex-col justify-center">
                  <span className="font-ui text-(--nav-text-subtle) text-micro/caption">
                    {totals.paidCount} of {totals.paidCount + totals.unpaidCount}{" "}
                    paid
                  </span>
                  <span className="font-mono text-(--nav-text-strong) text-micro/caption">
                    {money(totals.netUnpaid)} to pay
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col">
            {!loading && rows.length === 0 && (
              <div className="p-(--sp-5)">
                <EmptyState
                  title="No staff to pay"
                  description="Active staff appear here once added on the Roster tab."
                />
              </div>
            )}
            {rows.map((r) => {
              const n = Number(r.netPay);
              return (
                <div
                  key={r.staffId}
                  className="flex flex-col gap-(--sp-2) p-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="flex items-baseline justify-between gap-(--sp-4)">
                    <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                      {r.staffName}
                    </span>
                    <span
                      className={`font-mono font-(--weight-semibold) text-body/body shrink-0 ${
                        n < 0 ? "text-danger" : "[color:var(--text-primary)]"
                      }`}
                    >
                      {n < 0 ? "− " : ""}
                      KES {money(Math.abs(n).toFixed(2))}
                    </span>
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                    {rowCaption(r)}
                  </div>
                  <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {r.daysPresent} days × {money(r.dailyRate)} = gross{" "}
                    {money(r.grossPay)}
                    {Number(r.advances) > 0
                      ? ` · advances ${negMoney(r.advances)}`
                      : ""}
                    {Number(r.deductions) > 0
                      ? ` · deductions ${negMoney(r.deductions)}`
                      : ""}
                  </div>
                  <div className="pt-(--sp-1)">
                    <PayoutCell row={r} onPay={setDrawer} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SEPARATED handover-shortfalls block — never a pay column. */}
      <ShortfallsCard shortfalls={shortfalls} loading={sfLoading} />

      {drawer && (
        <PayoutDrawer
          pay={drawer}
          month={month}
          today={today}
          onPayOne={payOne}
          onClose={() => setDrawer(null)}
        />
      )}

      {advanceOpen && (
        <AdvanceDrawer
          month={month}
          today={today}
          onRecord={recordAdjustment}
          onClose={() => setAdvanceOpen(false)}
        />
      )}
    </div>
  );
}

