"use client";

// ADR-70 — the Admin states the business's Day-1 cash / M-Pesa position.
// Composed from the kit: <PageShell> + <Breadcrumb> + <InstructionalBanner>
// + <FormField> + <Button> + <Drawer> + <Toast>, following the structure of
// app/admin/financials/owner-draw-drawer.tsx and app/admin/stock/opening.
//
// The screen has TWO shapes, and the difference is the whole point:
//
//   Unset  → an entry form. "Tell Prosper what the business has right now."
//   Set    → a locked receipt showing the Day-1 figures NEXT TO today's
//            live balance, with a quiet "Correct a mistake" that opens a
//            warning-first drawer.
//
// Why not just leave the fields editable: on day 20 the Admin opens this
// screen, sees "Cash 40,000", and types today's 62,300 over it — silently
// restating Day 1 and moving every profit figure since. The backend cannot
// tell that apart from a legitimate correction (ADR-70), so the UI carries
// the distinction: the date is named in every sentence, today's balance
// sits beside the Day-1 one so the two read as different things, and the
// action is "Correct a mistake", never "Edit".

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { useToast } from "@/components/kit/toast";
import type { MoneyAccount } from "@/lib/domain/financials";
import {
  OpeningBalanceRequestError,
  useOpeningBalance,
} from "./use-opening-balance";

const ACCOUNT_LABEL: Record<MoneyAccount, string> = {
  cash: "Cash at hand",
  mpesa_bank: "M-Pesa / Bank",
};

const ACCOUNTS: MoneyAccount[] = ["cash", "mpesa_bank"];

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the amount and try again.",
  FORBIDDEN:
    "That day is closed. Reopen it from Day Close before correcting the opening balance.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

/** Signed, up to 2dp — M-Pesa/Bank may open overdrawn. */
const VALID_AMOUNT = /^-?\d+(\.\d{1,2})?$/;

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

/** "40000.00" → "40,000.00". Display only; never fed back to the domain. */
function kes(decimalString: string): string {
  const n = Number(decimalString);
  if (!Number.isFinite(n)) return decimalString;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "2026-09-05" → "5 Sept 2026". */
function longDate(businessDate: string): string {
  const d = new Date(`${businessDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return businessDate;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function OpeningBalanceClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { state, balances, loading, error, save } = useOpeningBalance();

  // Entry-form drafts, keyed by account (first-time setup only).
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [correcting, setCorrecting] = React.useState<MoneyAccount | null>(null);

  const accounts = state?.accounts ?? [];
  const anySet = accounts.some((a) => a.set);
  const businessDate = state?.businessDate ?? "";

  const liveFor = (account: MoneyAccount): string | null => {
    if (!balances) return null;
    return account === "cash" ? balances.cash : balances.mpesaBank;
  };

  const dirty = ACCOUNTS.filter((a) => VALID_AMOUNT.test((drafts[a] ?? "").trim()));
  const canSubmit = dirty.length > 0 && !submitting;

  async function submitAll() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      // Sequential, not parallel: the first save is what pins Day 1, and
      // two concurrent first-saves would each resolve the date before
      // either had written a row.
      for (const account of dirty) {
        await save(account, drafts[account].trim());
      }
      setDrafts({});
      toast("Opening balances saved.", { tone: "success" });
    } catch (e) {
      setFormError(
        e instanceof OpeningBalanceRequestError
          ? (CODE_MESSAGE[e.code] ?? e.message)
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <AdminPageHeader
      title={
        <Breadcrumb
          items={[
            { label: "Financials", href: "/admin/financials" },
            { label: "Opening Balances" },
          ]}
        />
      }
      actions={
        <div className="hidden md:flex items-center shrink-0 gap-(--sp-4)">
          <Button
            variant="secondary"
            onClick={() => router.push("/admin/financials")}
          >
            Back
          </Button>
          {!anySet && (
            <Button
              variant="primary"
              onClick={submitAll}
              disabled={!canSubmit}
              loading={submitting}
            >
              Save Opening Balances
            </Button>
          )}
        </div>
      }
    />
  );

  if (loading) {
    return (
      <PageShell>
        {header}
        <div className="font-ui [color:var(--text-tertiary)] text-body/sm">
          Loading…
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        {header}
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {header}

      <div className="flex flex-col gap-(--sp-7) max-w-[640px]">
        {anySet ? (
          /* ───────── SET: a locked receipt ───────── */
          <>
            <InstructionalBanner
              step={1}
              title={`Opening balances — set on ${longDate(businessDate)}`}
              body={
                <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  This is what the business started with on its first day. It
                  is <strong>not</strong> today&rsquo;s balance — today&rsquo;s
                  money is tracked automatically from sales, handovers and
                  expenses.
                </span>
              }
            />

            <div
              data-testid="opening-balance-summary"
              className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)]"
            >
              {ACCOUNTS.map((account) => {
                const row = accounts.find((a) => a.account === account);
                const live = liveFor(account);
                return (
                  <div
                    key={account}
                    className="flex items-center justify-between gap-(--sp-5) p-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
                  >
                    <div className="flex flex-col gap-(--sp-1) min-w-0">
                      <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                        {ACCOUNT_LABEL[account]}
                      </div>
                      <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                        {row?.set
                          ? `Day 1 · ${longDate(businessDate)}`
                          : "Not recorded"}
                        {row?.corrected ? " · corrected" : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-(--sp-7) shrink-0">
                      <div className="flex flex-col items-end gap-(--sp-1)">
                        <div className="text-[10px] [letter-spacing:var(--tracking-caps)] uppercase font-ui font-(--weight-semibold) [color:var(--text-tertiary)]">
                          Day 1 opening
                        </div>
                        <div className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-body/sm">
                          {row?.set ? `KES ${kes(row.amount)}` : "—"}
                        </div>
                      </div>

                      {/* Today's live balance, right beside it — the
                          strongest signal that these are different things. */}
                      <div className="flex flex-col items-end gap-(--sp-1)">
                        <div className="text-[10px] [letter-spacing:var(--tracking-caps)] uppercase font-ui font-(--weight-semibold) [color:var(--text-tertiary)]">
                          Today
                        </div>
                        <div className="font-mono font-(--weight-medium) [color:var(--text-secondary)] text-body/sm">
                          {live != null ? `KES ${kes(live)}` : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-(--sp-4)">
              {ACCOUNTS.map((account) => (
                <Button
                  key={account}
                  variant="tertiary"
                  onClick={() => setCorrecting(account)}
                >
                  Correct {ACCOUNT_LABEL[account]}
                </Button>
              ))}
            </div>
          </>
        ) : (
          /* ───────── UNSET: the entry form ───────── */
          <>
            <InstructionalBanner
              step={1}
              title="Set your opening balances"
              body={
                <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  Tell Prosper how much money the business has right now, so it
                  can track every shilling from here. You only do this once —
                  after this, balances update themselves from sales, handovers
                  and expenses. This will be recorded as{" "}
                  <strong>{longDate(businessDate)}</strong>, the business&rsquo;s
                  first day.
                </span>
              }
            />

            {formError && (
              <div role="alert" className="font-ui text-danger text-body/sm">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-(--sp-6)">
              {ACCOUNTS.map((account) => {
                const raw = drafts[account] ?? "";
                const invalid = raw.trim() !== "" && !VALID_AMOUNT.test(raw.trim());
                return (
                  <FormField
                    key={account}
                    label={ACCOUNT_LABEL[account]}
                    error={invalid && "Enter an amount, e.g. 40000 or 40000.00"}
                    hint={
                      account === "mpesa_bank"
                        ? "Combine M-Pesa and bank into one figure. May be negative if overdrawn."
                        : "Physical cash in the till and safe right now."
                    }
                  >
                    {({ id, "aria-describedby": describedBy }) => (
                      <div className={fieldBox} data-invalid={invalid || undefined}>
                        <span className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                          KES
                        </span>
                        <input
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          value={raw}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [account]: e.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder="0.00"
                          className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
                        />
                      </div>
                    )}
                  </FormField>
                );
              })}
            </div>

            {/* Mobile action (desktop lives in the header). */}
            <div className="flex md:hidden">
              <Button
                variant="primary"
                className="flex-1"
                onClick={submitAll}
                disabled={!canSubmit}
                loading={submitting}
              >
                Save Opening Balances
              </Button>
            </div>
          </>
        )}
      </div>

      {correcting && (
        <CorrectOpeningDrawer
          account={correcting}
          businessDate={businessDate}
          current={
            accounts.find((a) => a.account === correcting)?.amount ?? "0.00"
          }
          live={liveFor(correcting)}
          onSave={(amount) => save(correcting, amount)}
          onClose={() => setCorrecting(null)}
        />
      )}
    </PageShell>
  );
}

/**
 * The correction drawer. Leads with the warning, not the field — this is
 * the one place a mis-restatement can happen, and the copy has to make the
 * difference between "Day 1 was wrong" and "I have this much today"
 * impossible to miss.
 */
function CorrectOpeningDrawer({
  account,
  businessDate,
  current,
  live,
  onSave,
  onClose,
}: {
  account: MoneyAccount;
  businessDate: string;
  current: string;
  live: string | null;
  onSave: (amount: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(current);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const trimmed = amount.trim();
  const valid = VALID_AMOUNT.test(trimmed);
  const changed = valid && Number(trimmed) !== Number(current);

  async function submit() {
    if (!changed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(trimmed);
      toast(`${ACCOUNT_LABEL[account]} opening balance corrected.`, {
        tone: "success",
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof OpeningBalanceRequestError
          ? (CODE_MESSAGE[e.code] ?? e.message)
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Correct ${ACCOUNT_LABEL[account]}`}
      subtitle={`Day 1 — ${longDate(businessDate)}`}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!changed || submitting}
            loading={submitting}
          >
            Save Correction
          </Button>
        </>
      }
    >
      {/* The warning comes FIRST, before the field. */}
      {/* Same token pair the kit <Banner> uses for its warning tone; that
          component is action-oriented (it requires buttons), so this static
          note composes the tokens directly rather than forking the kit. */}
      <div
        role="note"
        className="flex flex-col gap-(--sp-3) p-(--sp-5) rounded-md border border-solid bg-warning-bg border-warning"
      >
        <div className="font-ui font-(--weight-semibold) text-warning text-body/sm">
          Only use this if the Day 1 figure was wrong.
        </div>
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          This changes what the business started with on{" "}
          <strong>{longDate(businessDate)}</strong>, and will change every
          profit report since. It is <strong>not</strong> how you record money
          you have today — that comes from sales, handovers and expenses
          automatically.
        </div>
      </div>

      {live != null && (
        <div className="flex items-center justify-between gap-(--sp-5) py-(--sp-4)">
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {ACCOUNT_LABEL[account]} today
          </span>
          <span className="font-mono font-(--weight-medium) [color:var(--text-secondary)] text-body/sm">
            KES {kes(live)}
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <FormField
        label={`Correct Day 1 ${ACCOUNT_LABEL[account]} to`}
        required
        error={
          trimmed !== "" && !valid && "Enter an amount, e.g. 40000 or 40000.00"
        }
        hint={`Currently recorded as KES ${kes(current)}.`}
      >
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox} data-invalid={(!valid && trimmed !== "") || undefined}>
            <span className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              KES
            </span>
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={(!valid && trimmed !== "") || undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>
    </Drawer>
  );
}
