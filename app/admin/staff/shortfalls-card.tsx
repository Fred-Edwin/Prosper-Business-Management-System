"use client";

// M4 S9B — the "Handover shortfalls this month" card for the Pay tab.
//
// A DISTINCT, SEPARATED block below the totals footer (design requirement
// 2): warning-framed, a DIFFERENT row shape from the pay table (name +
// "date · reason" caption + one --color-warning amount), and NO column
// that lines up with Advances / Deductions — so a shortfall can never be
// misread as a pay deduction (PRD §4.8, same class of problem as ADR-55's
// non-sale-consumption caption).
//
// Composed from a plain frame + tokens (--color-warning, --color-warning-bg,
// --surface-subtle) + the warning-triangle icon — NOT a kit banner
// component (per docs/design/flows/staff-screen.md).

import type { MonthlyShortfalls } from "@/lib/domain/staff";
import { money, shortDate } from "./format";

const WARNING_TRIANGLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path
      d="M12 3 2 20h20L12 3Z"
      fill="none"
      stroke="var(--color-warning)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="9"
      x2="12"
      y2="14"
      stroke="var(--color-warning)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
  </svg>
);

export function ShortfallsCard({
  shortfalls,
  loading,
}: {
  shortfalls: MonthlyShortfalls | null;
  loading: boolean;
}) {
  if (loading && !shortfalls) {
    return (
      <div className="mt-(--sp-9) kit-skeleton h-[120px] rounded-md mx-(--sp-6) md:mx-0" />
    );
  }
  if (!shortfalls || shortfalls.count === 0) {
    return (
      <div className="mt-(--sp-9) mx-(--sp-6) md:mx-0 flex flex-col p-(--sp-6) rounded-md gap-(--sp-2) [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]">
        <div className="flex items-center gap-(--sp-3)">
          {WARNING_TRIANGLE}
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Handover shortfalls this month
          </span>
        </div>
        <p className="font-ui [color:var(--text-secondary)] text-caption/micro">
          None this month. Shortfalls are tracked outside payroll — they are
          never deducted from pay.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-(--sp-9) mx-(--sp-6) md:mx-0 flex flex-col rounded-md overflow-clip [background-color:var(--surface-subtle)] border border-solid [border-color:var(--color-warning-bg)]">
      <div className="flex flex-col p-(--sp-6) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center gap-(--sp-3)">
          {WARNING_TRIANGLE}
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Handover shortfalls this month
          </span>
        </div>
        <p className="font-ui [color:var(--text-secondary)] text-caption/micro">
          Shown here for follow-up only. Shortfalls are never deducted from
          pay and are not part of the Net pay figures above — settle them
          separately with the staff member.
        </p>
      </div>

      {shortfalls.entries.map((e) => (
        <div
          key={e.id}
          className="flex items-start justify-between gap-(--sp-5) px-(--sp-6) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
        >
          <div className="flex flex-col min-w-0 gap-(--sp-1)">
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              {e.staffName}
            </span>
            <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {shortDate(e.date)} · {e.note}
            </span>
          </div>
          <span className="font-mono shrink-0 [color:var(--color-warning)] text-sm/sm">
            KES {money(e.amount)}
          </span>
        </div>
      ))}

      <div className="flex items-center justify-between gap-(--sp-4) px-(--sp-6) py-(--sp-4)">
        <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
          {shortfalls.count}{" "}
          {shortfalls.count === 1 ? "open shortfall" : "open shortfalls"} ·
          tracked outside payroll
        </span>
        <span className="font-mono font-(--weight-semibold) shrink-0 [color:var(--color-warning)] text-sm/sm">
          KES {money(shortfalls.total)}
        </span>
      </div>
    </div>
  );
}
