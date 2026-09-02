"use client";

// M3 S3 — the staff end-of-day Handover screen. One component, used by
// both /cashier/handover and /canteen/handover (the two roles that
// declare — ADR-53). The Store Manager does not hand over.
//
// COMPOSED from the kit — no kit change:
//   • heading + "Day open/closed" <StatusChip> (mirrors cashier-today)
//   • today's declaration: a 2-field form (cash + M-Pesa). If one already
//     exists for today it renders pre-filled and editable ("Update"); the
//     domain returns CONFLICT once the Admin has recorded a receipt —
//     caught and shown as "Already received — ask an administrator to
//     correct it." (the form goes read-only).
//   • own history below: past handovers with declared / received /
//     variance, read-only (a screen-level card list).
//   • NO date picker — staff are today-only by rule.
//   • sticky bottom action bar with the primary submit (flow-scaffold
//     pattern, like cashier-today).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/text-input";
import { StatusChip } from "@/components/kit/status-chip";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type { HandoverView } from "@/lib/domain/handovers";
import {
  useMyHandover,
  HandoverRequestError,
  nairobiBusinessDate,
} from "./use-my-handover";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

const CONFLICT_MSG =
  "Already received — ask an administrator to correct it.";

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN:
    "The day is closed, or this isn't today's handover. Ask an administrator.",
  NOT_FOUND: "That handover no longer exists — reload the screen.",
  VALIDATION_ERROR: "Check the cash and M-Pesa figures and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

/** "5,000.00" from a "5000.00" decimal string; "—" for null. */
function money(dec: string | null): string {
  if (dec == null) return "—";
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/** "+120.00" / "-500.00". `null` → "—". */
function fmtVariance(dec: string | null): string {
  if (dec == null) return "—";
  const n = Number(dec);
  if (!Number.isFinite(n)) return dec;
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

function varClass(dec: string | null): string {
  if (dec == null) return "[color:var(--text-secondary)]";
  const n = Number(dec);
  if (!Number.isFinite(n) || n === 0) return "[color:var(--text-secondary)]";
  return n < 0 ? "text-danger" : "text-success";
}

/** "Wed 3 Sep" in Africa/Nairobi. */
function nairobiDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function HandoverClient({
  locationLabel,
}: {
  locationLabel: string;
}) {
  const { toast } = useToast();
  const { todaysHandover, history, loading, error, refresh, declare, editOwn } =
    useMyHandover();

  const alreadyReceived = (todaysHandover?.receipts.length ?? 0) > 0;

  return (
    <div className="flex flex-col grow min-h-0">
      <div className="flex flex-col pt-(--sp-6) pb-(--sp-5) gap-(--sp-5) px-(--sp-6)">
        <div className="flex items-center justify-between">
          <h1 className="font-ui tracking-[-0.01em] font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Handover
          </h1>
          <div className="flex items-center py-(--sp-2) px-(--sp-4) rounded-lg gap-(--sp-3) bg-success-bg">
            <StatusChip variant="success">Day open</StatusChip>
          </div>
        </div>
        <p className="font-ui [color:var(--text-secondary)] text-sm/sm">
          Declare the cash and M-Pesa you're handing over for {locationLabel}{" "}
          today. The administrator confirms what was actually received.
        </p>
      </div>

      <div className="flex flex-col grow min-h-0 border-t border-t-solid [border-top-color:var(--border-subtle)]">
        {error ? (
          <div className="p-(--sp-6)">
            <ErrorState
              title="Couldn't load your handover"
              description={error}
              onRetry={() => void refresh()}
            />
          </div>
        ) : loading ? (
          <div className="flex flex-col p-(--sp-6) gap-(--sp-4)">
            <div className="kit-skeleton h-[52px] w-full rounded-sm" />
            <div className="kit-skeleton h-[52px] w-full rounded-sm" />
          </div>
        ) : (
          <div className="flex flex-col grow min-h-0 overflow-y-auto">
            <DeclarationForm
              existing={todaysHandover}
              locked={alreadyReceived}
              onDeclare={async (cash, mpesa) => {
                await declare({ cashDeclared: cash, mpesaDeclared: mpesa });
                toast("Handover declared", { tone: "success" });
              }}
              onEdit={async (id, cash, mpesa) => {
                await editOwn(id, { cashDeclared: cash, mpesaDeclared: mpesa });
                toast("Handover updated", { tone: "success" });
              }}
            />

            <HistoryList history={history} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Declaration form ───────────────────────────────────────────────────

function DeclarationForm({
  existing,
  locked,
  onDeclare,
  onEdit,
}: {
  existing: HandoverView | null;
  /** A receipt exists → the domain would return CONFLICT on edit. */
  locked: boolean;
  onDeclare: (cash: string, mpesa: string) => Promise<void>;
  onEdit: (id: string, cash: string, mpesa: string) => Promise<void>;
}) {
  const [cash, setCash] = React.useState(existing?.cashDeclared ?? "");
  const [mpesa, setMpesa] = React.useState(existing?.mpesaDeclared ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Re-seed when the loaded declaration changes (post-refresh).
  React.useEffect(() => {
    setCash(existing?.cashDeclared ?? "");
    setMpesa(existing?.mpesaDeclared ?? "");
  }, [existing?.id, existing?.cashDeclared, existing?.mpesaDeclared]);

  const cashValid = MONEY_RE.test(cash.trim());
  const mpesaValid = MONEY_RE.test(mpesa.trim());
  const canSubmit = cashValid && mpesaValid && !submitting && !locked;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (existing) {
        await onEdit(existing.id, cash.trim(), mpesa.trim());
      } else {
        await onDeclare(cash.trim(), mpesa.trim());
      }
    } catch (e) {
      if (e instanceof HandoverRequestError) {
        setError(
          e.code === "CONFLICT"
            ? CONFLICT_MSG
            : (CODE_MESSAGE[e.code] ?? e.message),
        );
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = existing ? "Update handover" : "Declare handover";

  return (
    <div className="flex flex-col shrink-0 px-(--sp-6) py-(--sp-6) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
        {existing ? "Today's declaration" : "Declare today's handover"}
      </div>

      {locked && (
        <div
          role="status"
          className="flex items-start gap-(--sp-3) py-(--sp-4) px-(--sp-4) rounded-md bg-warning-bg"
        >
          <p className="font-ui [color:var(--text-secondary)] text-caption/caption">
            {CONFLICT_MSG}
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <TextInput
        label="Cash"
        required
        inputMode="decimal"
        startAdornment="KES"
        value={cash}
        disabled={locked}
        error={cash.trim().length > 0 && !cashValid}
        helperText={
          cash.trim().length > 0 && !cashValid
            ? "Enter a number with up to 2 decimal places."
            : undefined
        }
        onChange={(e) => setCash(e.target.value)}
        className="w-full"
      />

      <TextInput
        label="M-Pesa"
        required
        inputMode="decimal"
        startAdornment="KES"
        value={mpesa}
        disabled={locked}
        error={mpesa.trim().length > 0 && !mpesaValid}
        helperText={
          mpesa.trim().length > 0 && !mpesaValid
            ? "Enter a number with up to 2 decimal places."
            : undefined
        }
        onChange={(e) => setMpesa(e.target.value)}
        className="w-full"
      />

      {!locked && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={!canSubmit}
          loading={submitting}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

// ── Own history ────────────────────────────────────────────────────────

function HistoryList({ history }: { history: HandoverView[] }) {
  return (
    <div className="flex flex-col grow min-h-0">
      <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body px-(--sp-6) pt-(--sp-6) pb-(--sp-4)">
        Past handovers
      </div>

      {history.length === 0 ? (
        <div className="flex grow items-center justify-center p-(--sp-6)">
          <EmptyState
            title="No past handovers"
            description="Handovers you declared on earlier days show up here with what the administrator received."
          />
        </div>
      ) : (
        <div className="flex flex-col">
          {history.map((h) => {
            const receipt = h.receipts.at(-1) ?? null;
            return (
              <div
                key={h.id}
                className="flex flex-col px-(--sp-6) py-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                    {nairobiDayLabel(h.occurredAt)}
                  </span>
                  {receipt ? (
                    <StatusChip variant="success">Received</StatusChip>
                  ) : (
                    <StatusChip variant="warning">Awaiting receipt</StatusChip>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                    Declared
                  </span>
                  <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                    {money(h.cashDeclared)}
                    <span className="[color:var(--text-tertiary)]"> / </span>
                    {money(h.mpesaDeclared)}
                  </span>
                </div>

                {receipt && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                        Received
                      </span>
                      <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                        {money(receipt.cashReceived)}
                        <span className="[color:var(--text-tertiary)]"> / </span>
                        {money(receipt.mpesaReceived)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                        Variance
                      </span>
                      <span className="font-mono text-sm/sm">
                        <span className={varClass(receipt.cashVariance)}>
                          {fmtVariance(receipt.cashVariance)}
                        </span>
                        <span className="[color:var(--text-tertiary)]"> / </span>
                        <span className={varClass(receipt.mpesaVariance)}>
                          {fmtVariance(receipt.mpesaVariance)}
                        </span>
                      </span>
                    </div>
                    {receipt.shortfalls.length > 0 && (
                      <div className="font-ui text-danger text-caption/micro">
                        {receipt.shortfalls.map((s) => s.note).join(" · ")}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
