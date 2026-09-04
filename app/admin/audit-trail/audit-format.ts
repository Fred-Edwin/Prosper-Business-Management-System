// M5 S15 — the audit-trail screen's per-row formatting. `oldValue` /
// `newValue` are free-form JSON whose shape varies by action (see
// docs/API.md "oldValue / newValue shapes vary by action"). This module
// turns one entry into:
//   • a one-line human summary  (summarise / batchSummary)
//   • a FIELD/WAS/NOW field list, or null → the raw before/after fallback
//     (resolveFields)
//   • the "what was touched" label + link + fallback style (entityDisplay)
//   • the action label + colour tone (actionLabel / actionTone)
//
// Keep the readable common case per action group; fall back to raw JSON
// blocks when a row doesn't fit — never a generic deep-diff.

import type { AuditAction } from "@prisma/client";
import type { AuditLogEntryView, AuditLogItem } from "@/lib/domain/audit";

// ── Action label + tone (audit-screen.md — confirmed vs the enum) ──────

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  correct: "Corrected",
  soft_delete: "Deleted",
  hard_delete: "Deleted",
  login: "Signed in",
  day_close: "Day closed",
  day_reopen: "Day reopened",
};

export function actionLabel(a: AuditAction): string {
  return ACTION_LABELS[a] ?? a;
}

/** `Corrected` → warning; `Deleted` → danger; everything else → secondary. */
export function actionTone(a: AuditAction): string {
  if (a === "correct") return "[color:var(--color-warning)]";
  if (a === "soft_delete" || a === "hard_delete") return "[color:var(--color-danger)]";
  return "[color:var(--text-secondary)]";
}

// ── Timestamps (Africa/Nairobi) ──────────────────────────────────────

const NAIROBI: Intl.DateTimeFormatOptions = { timeZone: "Africa/Nairobi" };
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09-03T11:22:00Z" → "3 Sep, 14:22" (Nairobi). `"time"` → "14:22". */
export function fmtWhen(iso: string, mode: "full" | "time" = "full"): string {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", {
    ...NAIROBI,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  if (mode === "time") return time;
  const parts = new Intl.DateTimeFormat("en-CA", {
    ...NAIROBI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  const now = new Date();
  const thisYear = new Intl.DateTimeFormat("en-CA", {
    ...NAIROBI,
    year: "numeric",
  }).format(now);
  const yearSuffix = y === thisYear ? "" : ` ${y}`;
  return `${day} ${MONTHS[m - 1]}${yearSuffix}, ${time}`;
}

/** "2026-09-02" → "2 Sep 2026". Passes anything non-ISO straight through. */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

// ── Humanising values ────────────────────────────────────────────────

const ENUM_HUMAN: Record<string, string> = {
  mpesa: "M-Pesa",
  mpesa_bank: "M-Pesa / Bank",
  cash: "Cash",
  credit: "Credit",
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  purchase_receipt: "Purchase receipt",
  transfer: "Transfer",
  issue: "Issue",
  production: "Production",
  non_sale_consumption: "Non-sale consumption",
  receipt: "Receipt",
  draw: "Draw",
  return: "Return",
  advance: "Advance",
  deduction: "Deduction",
};

const NUMERIC_KEYS = new Set([
  "total", "amount", "amountTo", "quantity", "dailyRate", "daily_rate",
  "netPaid", "net_paid", "cashDeclared", "mpesaDeclared", "cash_declared",
  "mpesa_declared", "purchaseCost", "purchase_cost", "sellingPrice",
  "buyingPrice", "deliveryFee", "cashDeclaredTo", "mpesaDeclaredTo",
  "cashDelta", "mpesaDelta", "amountDelta", "sold", "revenue",
  "countedQuantity",
]);

// Keys that are ids / plumbing, never shown as a field.
const HIDDEN_KEYS = new Set([
  "correlationId", "correctsOrderId", "correctsMovementId", "correctionId",
  "correctsExpenseId", "correctsHandoverId", "id", "closedBy", "staffId",
  "expenseId", "productId", "locationId", "orderId",
]);

function titleCase(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function humanScalar(v: unknown, numeric: boolean): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return numeric ? v.toFixed(2) : String(v);
  if (typeof v === "string") {
    if (ENUM_HUMAN[v]) return ENUM_HUMAN[v];
    if (numeric && /^-?\d+(\.\d+)?$/.test(v)) return Number(v).toFixed(2);
    return v;
  }
  return String(v);
}

// ── FIELD / WAS / NOW resolution ─────────────────────────────────────

export type ChangeField = {
  label: string;
  was: string;
  now: string;
  kind: "number" | "text";
};

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Reduce `oldValue`/`newValue` to a FIELD/WAS/NOW list, or `null` when
 * the shape doesn't fit (nested objects, raw ids only) — the screen then
 * renders the raw before/after fallback.
 */
export function resolveFields(entry: AuditLogEntryView): ChangeField[] | null {
  const oldV = asObj(entry.oldValue);
  const newV = asObj(entry.newValue);

  // create: no "was" — the newValue fields alone, as a readout.
  if (entry.action === "create") {
    if (!newV) return null;
    const fields = Object.entries(newV)
      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && k !== "action" && !isNested(v))
      .map(([k, v]) => {
        const numeric = NUMERIC_KEYS.has(k);
        return {
          label: titleCase(k),
          was: "—",
          now: humanScalar(v, numeric),
          kind: numeric ? ("number" as const) : ("text" as const),
        };
      });
    return fields.length > 0 ? fields : null;
  }

  // correct / delete: pair keys present on either side.
  const keys = new Set([
    ...Object.keys(oldV ?? {}),
    ...Object.keys(newV ?? {}),
  ]);
  const fields: ChangeField[] = [];
  for (const k of keys) {
    if (HIDDEN_KEYS.has(k) || k === "action") continue;
    const before = oldV?.[k];
    const after = newV?.[k];
    if (isNested(before) || isNested(after)) return null; // → raw fallback
    if (before === undefined && after === undefined) continue;
    const numeric = NUMERIC_KEYS.has(k);
    const wasStr = humanScalar(before, numeric);
    const nowStr = humanScalar(after, numeric);
    if (wasStr === nowStr) continue; // unchanged — skip
    fields.push({
      label: titleCase(k),
      was: wasStr,
      now: nowStr,
      kind: numeric ? "number" : "text",
    });
  }
  return fields.length > 0 ? fields : null;
}

function isNested(v: unknown): boolean {
  return v != null && typeof v === "object";
}

// ── One-line summary ─────────────────────────────────────────────────

/** The prose summary shown in the row (audit-screen.md §"One-line summary"). */
export function summarise(entry: AuditLogEntryView): string {
  if (entry.action === "day_close") return "Sealed the day — staff entries locked";
  if (entry.action === "day_reopen") return "Reopened the day";

  const fields = resolveFields(entry);

  if (entry.action === "create") {
    const created = createSentence(entry);
    if (created) return created;
    if (fields && fields.length > 0) {
      return fields
        .slice(0, 2)
        .map((f) => `${f.label} ${f.now}`)
        .join(" · ");
    }
    return "Record created";
  }

  if (entry.action === "soft_delete" || entry.action === "hard_delete") {
    return fields && fields.length > 0
      ? "Record removed — expand for the values"
      : "Record removed";
  }

  // correct
  if (!fields) return "Record changed — expand for detail";
  if (fields.length === 1) {
    const f = fields[0];
    return `${f.label} ${f.was} → ${f.now}`;
  }
  const names = fields.slice(0, 3).map((f) => f.label.toLowerCase());
  const more = fields.length > 3 ? "…" : "";
  return `${fields.length} fields changed — ${names.join(", ")}${more}`;
}

/** A human sentence for a `create`, per entity type. `null` → caller falls
 *  back to the field readout. */
function createSentence(entry: AuditLogEntryView): string | null {
  const v = asObj(entry.newValue);
  if (!v) return null;
  switch (entry.entityType) {
    case "order":
      return v.total != null ? `Recorded sale · KES ${humanScalar(v.total, true)}` : null;
    case "expense": {
      const cat = typeof v.category === "string" ? titleCase(v.category) : "Expense";
      const from =
        typeof v.paidFromAccount === "string"
          ? ` from ${humanScalar(v.paidFromAccount, false)}`
          : "";
      return v.amount != null
        ? `Paid KES ${humanScalar(v.amount, true)}${from} · ${cat}`
        : null;
    }
    case "staff_payout":
      return v.netPaid != null
        ? `Paid KES ${humanScalar(v.netPaid, true)}${
            typeof v.paidFromAccount === "string"
              ? ` from ${humanScalar(v.paidFromAccount, false)}`
              : ""
          }`
        : null;
    case "staff":
      return typeof v.name === "string" ? `Added ${v.name}` : null;
    case "staff_pay_adjustment":
      return v.amount != null && typeof v.type === "string"
        ? `${humanScalar(v.type, false)} · KES ${humanScalar(v.amount, true)}`
        : null;
    default:
      return null;
  }
}

/** The batch summary line ("6 items received · Store · 9:14am"). */
export function batchSummary(
  item: Extract<AuditLogItem, { kind: "batch" }>,
): string {
  // `subAction` is `newValue.action` — the batch write side stamps values
  // like "purchase_receipt", "issue_batch", "transfer_batch",
  // "production_batch", "non_sale_batch". Normalise: drop a "_batch"
  // suffix, then map to a past-tense verb.
  const sub = (item.subAction ?? "").replace(/_batch$/, "");
  const verb =
    sub === "purchase_receipt" || sub === "receipt"
      ? "received"
      : sub === "transfer"
        ? "transferred"
        : sub === "issue"
          ? "issued"
          : sub === "production"
            ? "produced"
            : sub === "non_sale_consumption" || sub === "non_sale"
              ? "consumed"
              : "changed";
  const noun = item.count === 1 ? "item" : "items";
  const time = fmtWhen(item.occurredAt, "time");
  return `${item.count} ${noun} ${verb} · ${time}`;
}

// ── "What was touched" ───────────────────────────────────────────────

export type EntityDisplay = {
  label: string;
  href?: string;
  /** true → render mono / micro (a hard-deleted target shown by id). */
  mono?: boolean;
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  order: "Order",
  stock_movement: "Stock movement",
  stock_count: "Stock count",
  handover: "Handover",
  receipt_of_handover: "Receipt",
  expense: "Expense",
  owner_transaction: "Owner transaction",
  repayment: "Repayment",
  staff: "Staff",
  staff_payout: "Staff payout",
  staff_pay_adjustment: "Pay adjustment",
  location: "Location",
  product: "Product",
  asset: "Asset",
  customer: "Customer",
  day_close: "Business day",
  money_movement: "Money movement",
  user: "User",
};

/** Which entity types link, and to where (audit-screen.md table). A row
 *  whose target has been hard-deleted (no `entityLabel`) shows the type +
 *  a truncated id, no link — rendered gracefully, not as an error. */
export function entityDisplay(entry: AuditLogEntryView): EntityDisplay {
  const typeLabel = ENTITY_TYPE_LABEL[entry.entityType] ?? entry.entityType;

  // day_close: the id IS the date — no link. Show it as "2 Sep 2026".
  if (entry.entityType === "day_close") {
    return { label: `${typeLabel} · ${fmtDate(entry.entityLabel ?? entry.entityId)}` };
  }

  if (!entry.entityLabel) {
    // Unresolved — a hard-deleted target, or a type with no cheap name
    // (money_movement, receipt_of_handover, staff_pay_adjustment, user).
    const shortId =
      entry.entityId.length > 10
        ? `${entry.entityId.slice(0, 4)}…${entry.entityId.slice(-3)}`
        : entry.entityId;
    return { label: `${typeLabel} · ${shortId}`, mono: true };
  }

  const label = `${typeLabel} · ${entry.entityLabel}`;
  const href = hrefFor(entry);
  return href ? { label, href } : { label };
}

function hrefFor(entry: AuditLogEntryView): string | undefined {
  switch (entry.entityType) {
    case "order":
      return `/admin/sales`;
    case "stock_movement":
    case "stock_count":
      return `/admin/stock`;
    case "handover":
    case "receipt_of_handover":
      return `/admin/financials?tab=handovers`;
    case "expense":
    case "staff_pay_adjustment":
      return `/admin/financials?tab=expenses`;
    case "owner_transaction":
      return `/admin/financials?tab=owner-draws`;
    case "staff":
    case "staff_payout":
      return `/admin/staff`;
    case "location":
    case "product":
      return `/admin/catalog`;
    case "asset":
      return `/admin/assets`;
    case "customer":
    case "repayment":
      return `/admin/customers`;
    default:
      return undefined;
  }
}
