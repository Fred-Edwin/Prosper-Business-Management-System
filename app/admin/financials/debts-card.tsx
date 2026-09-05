"use client";

// M5 v2 Session C — "Debts owed to the business" on /admin/financials.
// Paper `Financials — desktop [v2]` (Debts Card) / `Financials — mobile
// [v2]`. Spec: financials-screen.md "Structure (v2 — current)" §3.
//
// v2 promotes what was a single balance LINE into a real, actionable
// table — the owner's explicit ask: she needs to see *who* owes money and
// get to their account, not just a total. Each row links to
// /admin/customers/[id]; a trailing "View all customer credit →" row goes
// to the full register.
//
// ADR-57 — this is a BALANCE, AS OF NOW. It is deliberately NOT scoped by
// the header's date-range control (the rows come from
// `?owingOnly=true`, which has no range parameter at all), and the "as of
// today" caption is mandatory, not decorative: a correct number shown so
// it invites a wrong reading is still a bug.
//
// The TOTAL is `consolidated.debtsOwedToBusiness` off the shared summary
// — the authoritative figure, unchanged by v2. The ROWS come from the
// customers endpoint. They are two different reads of the same truth, so
// the card shows the summary's total rather than re-summing the rows.
//
// Exact values from get_computed_styles: card 8px radius / 1px
// --border-subtle; header 16px top / 12px bottom / 20px inline, title
// 13px/16px 600, sub-caption 11px/14px 400 --text-disabled, total mono
// 18px/22px 600; table head 8px/20px on --surface-subtle, 11px/14px 600
// 0.04em uppercase; rows 11px/20px, name 13px/16px 500 --color-accent,
// amount mono 13px/16px 400, date 12px/16px 400 --text-tertiary; column
// flex ratios 1.6 / 1 / 1 + a 24px trailing arrow slot; "view all" row
// 10px/20px on --surface-subtle, 12px/16px 500 --color-accent.

import * as React from "react";
import Link from "next/link";
import type { CustomerListRow } from "@/lib/domain/customers";
import { ErrorState } from "@/components/kit/error-state";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/** An ISO instant → "Aug 29, 2026" in the fixed business timezone. */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")} ${get("day")}, ${get("year")}`;
}

/** Mobile's "Since Aug 29, 2026" caption. */
function since(iso: string | null): string {
  return iso ? `Since ${fmtDate(iso)}` : "No dated debt";
}

const COL_NAME = "grow-[1.6] basis-0 min-w-0";
const COL_NUM = "grow basis-0 min-w-0 text-right";
const HEAD =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/[14px]";

export function DebtsCard({
  customers,
  total,
  loading,
  error,
  onRetry,
}: {
  /**
   * Customers with a strictly positive balance, pre-sorted oldest-unpaid
   * first by the server (`?owingOnly=true`) — never re-sorted here.
   */
  customers: CustomerListRow[];
  /** `consolidated.debtsOwedToBusiness` — a balance, as of now. */
  total: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]">
      {/* Header — title + mandatory "as of today" caption + the total. */}
      <div className="flex items-baseline justify-between gap-(--sp-5) pt-[16px] pb-[12px] px-[20px] md:px-[20px]">
        <div className="flex flex-col gap-[2px] min-w-0">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            Debts owed to the business
          </h2>
          <span className="font-ui font-(--weight-regular) [color:var(--text-disabled)] text-micro/[14px]">
            <span className="hidden md:inline">
              Unpaid customer credit, as of today — click a customer to see
              their account
            </span>
            <span className="md:hidden">
              Unpaid customer credit, as of today · tap a customer to see
              their account
            </span>
          </span>
        </div>
        <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[22px] md:text-h1/[22px] shrink-0">
          {total != null ? `KES ${money(total)}` : "—"}
        </span>
      </div>

      {error ? (
        <div className="px-[20px] pb-[16px]">
          <ErrorState
            title="Couldn't load customer debts"
            description={error}
            onRetry={onRetry}
          />
        </div>
      ) : loading && customers.length === 0 ? (
        <div className="px-[20px] pb-[16px]">
          <div className="kit-skeleton h-[72px] w-full rounded-md" />
        </div>
      ) : customers.length === 0 ? (
        <div className="px-[20px] py-[16px] border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            No customer owes the business right now.
          </span>
        </div>
      ) : (
        <>
          {/* Desktop — a compact table. Headers stay visible. */}
          <div className="hidden md:flex items-center w-full py-[8px] px-[20px] [background-color:var(--surface-subtle)] border-y border-y-solid [border-block-color:var(--border-subtle)]">
            <span className={`${COL_NAME} ${HEAD}`}>Customer</span>
            <span className={`${COL_NUM} ${HEAD}`}>Amount owed</span>
            <span className={`${COL_NUM} ${HEAD}`}>Oldest unpaid</span>
            <span aria-hidden className="w-[24px] shrink-0" />
          </div>
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="no-underline border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-interactive kit-focus-ring"
            >
              {/* Desktop row */}
              <span className="hidden md:flex items-center w-full py-[11px] px-[20px]">
                <span
                  className={`${COL_NAME} font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/sm truncate`}
                >
                  {c.name}
                </span>
                <span
                  className={`${COL_NUM} font-mono [color:var(--text-primary)] text-sm/sm`}
                >
                  {money(c.balance)}
                </span>
                <span
                  className={`${COL_NUM} font-ui [color:var(--text-tertiary)] text-caption/[16px]`}
                >
                  {fmtDate(c.oldestDebtAt)}
                </span>
                <span
                  aria-hidden
                  className="w-[24px] shrink-0 text-right font-ui [color:var(--text-tertiary)] text-sm/sm"
                >
                  →
                </span>
              </span>

              {/* Mobile row — name + "Since <date>" left, amount right. */}
              <span className="md:hidden flex items-center justify-between gap-(--sp-4) w-full py-[11px] px-[16px]">
                <span className="flex flex-col gap-[1px] min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/sm truncate">
                    {c.name}
                  </span>
                  <span className="font-ui [color:var(--text-tertiary)] text-caption/[16px] truncate">
                    {since(c.oldestDebtAt)}
                  </span>
                </span>
                <span className="font-mono [color:var(--text-primary)] text-sm/sm shrink-0">
                  {money(c.balance)}
                </span>
              </span>
            </Link>
          ))}
        </>
      )}

      {/* Trailing "view all" row — always present, even when nobody owes:
          it is the way to the full credit register, not a row action. */}
      <Link
        href="/admin/customers"
        className="flex justify-center md:justify-end py-[10px] px-[20px] no-underline [background-color:var(--surface-subtle)] border-t border-t-solid [border-top-color:var(--border-subtle)] kit-interactive kit-focus-ring"
      >
        <span className="font-ui font-(--weight-medium) [color:var(--color-accent)] text-caption/[16px]">
          View all customer credit →
        </span>
      </Link>
    </section>
  );
}
