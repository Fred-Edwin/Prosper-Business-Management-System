import type { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateStartUtc, businessDateEndUtc } from "@/lib/time";
import { DomainError } from "./errors";
import type {
  AuditLogEntryView,
  AuditLogItem,
  AuditLogPage,
  ListAuditLogFilter,
} from "./types";

/**
 * The audit-trail READ side (M5 S11 — the write side has existed since M1,
 * ADR-25). Every domain module appends an `AuditLog` row on create /
 * correct / delete / login / day close+reopen; this is the paginated,
 * newest-first read the Audit Trail screen renders.
 *
 * ── Pagination — PAGE BY ITEM, NOT BY ROW (M5 S15, ADR-65) ───────────
 * OFFSET/limit, not a cursor. Justification: the screen is an
 * investigator's tool — it needs "page 7", a total count, and stable
 * page sizes under active filters far more than it needs the O(1)
 * deep-scroll a cursor buys. The table is bounded by human activity
 * (tens of rows/day), so a large OFFSET is not a real cost here. Ties on
 * `occurredAt` are broken by `id` so page boundaries never duplicate or
 * drop a row.
 *
 * A "batch" — several `AuditLog` rows written in ONE transaction, sharing
 * a `correlationId` stamped inside `newValue` (ADR-25: a 6-line purchase
 * receipt is 6 rows) — is one ITEM. It must never be split across two
 * pages, so we cannot `skip`/`take` raw rows at the DB. Instead: apply
 * every filter at the DB, fetch the whole matching set newest-first (up
 * to `SCAN_CEILING` — well beyond any real filtered window at tens of
 * rows/day), fold rows sharing a `correlationId` + `action` into one
 * `AuditLogItem`, then slice `[offset, offset+limit)` ITEMS. `total` is
 * the item count. Entity-label resolution then runs only over the sliced
 * page's rows — still one batched query per entity type (see ADR-65 for
 * the volume argument and the ceiling fallback).
 *
 * ── The `significant` filter ─────────────────────────────────────────
 * `filter.group: "significant"` returns only the investigable subset the
 * screen defaults to — corrections, deletions, day close/reopen, and the
 * staff/location/payout writes (see `SIGNIFICANT_ACTIONS` +
 * `SIGNIFICANT_ENTITY_TYPES`). Routine `create` rows for orders, stock
 * movements, handovers, expenses and money movements are excluded.
 * Passing an explicit `action` or `entityType` alongside it still
 * narrows within that subset.
 *
 * ── Actor name ──────────────────────────────────────────────────────
 * Each row carries `actorName` (the `User.name`), resolved with a single
 * `include` — never a query per row.
 *
 * ── Entity resolution ───────────────────────────────────────────────
 * `entityLabel` is a best-effort human string (an order's total, a
 * product name, a staff name, the sealed date). It is filled with ONE
 * batched query per entity type present on the page — never one per row.
 * Where a label cannot be produced cheaply the field is `null` and the
 * screen falls back to `entityType #entityId`.
 */

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Upper bound on rows pulled into memory for one filtered query before
 * grouping + slicing (ADR-65). At tens of `AuditLog` rows/day a filtered
 * window (a date range, one actor, one entity type, or the significant
 * subset) sits far under this. If a query ever exceeds it the oldest
 * rows past the ceiling are simply not paged — an unreachable case for
 * the screen's own filters; documented rather than engineered around.
 */
const SCAN_CEILING = 5000;

/**
 * Pull a `correlationId` out of a row's `newValue` JSON (ADR-25 —
 * `newCorrelationId()` writes `batch_<uuid>`). Not a column. Returns
 * `null` for a plain (non-batched) row.
 */
function correlationIdOf(newValue: Prisma.JsonValue | null): string | null {
  if (newValue && typeof newValue === "object" && !Array.isArray(newValue)) {
    const cid = (newValue as Record<string, unknown>).correlationId;
    if (typeof cid === "string" && cid.length > 0) return cid;
  }
  return null;
}

/**
 * The `newValue.action` sub-label (`purchase_receipt`, `transfer`,
 * `issue`, `production`, `non_sale_consumption`, …). For `stock_movement`
 * the enum `action` column is always `create`; this is the real verb.
 */
function subActionOf(newValue: Prisma.JsonValue | null): string | null {
  if (newValue && typeof newValue === "object" && !Array.isArray(newValue)) {
    const a = (newValue as Record<string, unknown>).action;
    if (typeof a === "string" && a.length > 0) return a;
  }
  return null;
}

/**
 * Actions that are always "significant" regardless of entity type.
 * `create` is deliberately absent — a bare create is the routine case.
 */
const SIGNIFICANT_ACTIONS: ReadonlySet<AuditAction> = new Set<AuditAction>([
  "correct",
  "soft_delete",
  "hard_delete",
  "day_close",
  "day_reopen",
]);

/**
 * Entity types whose `create` rows ARE significant (staff lifecycle,
 * payouts, pay adjustments). Everything else's `create` is routine.
 */
const SIGNIFICANT_ENTITY_TYPES: ReadonlySet<string> = new Set<string>([
  "staff",
  "staff_payout",
  "staff_pay_adjustment",
]);

/**
 * Flatten a page of items back to the raw per-row entries, newest-first —
 * the pre-S15 shape. For callers / tests that don't care about batch
 * grouping. A `"single"` yields its one entry; a `"batch"` yields its
 * `entries` in order.
 */
export function flattenAuditItems(
  items: readonly AuditLogItem[],
): AuditLogEntryView[] {
  return items.flatMap((it) =>
    it.kind === "single" ? [it.entry] : it.entries,
  );
}

function assertBusinessDate(value: string, field: "from" | "to"): void {
  if (!BUSINESS_DATE_RE.test(value)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${field} must be a YYYY-MM-DD business date.`,
      field,
    );
  }
}

export async function listAuditLog(
  filter: ListAuditLogFilter = {},
): Promise<AuditLogPage> {
  const where: Prisma.AuditLogWhereInput = {};

  if (filter.from || filter.to) {
    where.occurredAt = {};
    if (filter.from) {
      assertBusinessDate(filter.from, "from");
      where.occurredAt.gte = businessDateStartUtc(filter.from);
    }
    if (filter.to) {
      assertBusinessDate(filter.to, "to");
      where.occurredAt.lt = businessDateEndUtc(filter.to);
    }
  }
  if (filter.actorId) where.userId = filter.actorId;
  if (filter.action) where.action = filter.action;
  if (filter.entityType) where.entityType = filter.entityType;

  if (filter.group === "significant") {
    // significant ⇔ (action ∈ SIGNIFICANT_ACTIONS) OR
    //              (entityType ∈ SIGNIFICANT_ENTITY_TYPES)
    // An explicit action/entityType filter above still applies (AND).
    where.OR = [
      { action: { in: [...SIGNIFICANT_ACTIONS] } },
      { entityType: { in: [...SIGNIFICANT_ENTITY_TYPES] } },
    ];
  }

  const limit = Math.min(
    Math.max(1, filter.limit ?? DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const offset = Math.max(0, filter.offset ?? 0);

  // Fetch the whole filtered set newest-first (bounded by SCAN_CEILING),
  // then group + slice by ITEM below. We cannot skip/take raw rows at the
  // DB: a batch must stay whole (ADR-65).
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: SCAN_CEILING,
    include: { user: { select: { name: true } } },
  });
  type Raw = (typeof rows)[number];

  // ── Group rows into ordered item-buckets ────────────────────────────
  // A row with no `correlationId` is its own single-row bucket. Rows
  // sharing a `correlationId` AND the same `action` fold into one bucket,
  // anchored at the position of the batch's first-seen (newest) row so
  // overall newest-first order is preserved. A `correlationId` set that
  // spans two `action` values (rare — noted in the task) splits into one
  // bucket per action; each stays contiguous at its own newest row.
  const buckets: Raw[][] = [];
  const bucketByKey = new Map<string, Raw[]>();
  for (const r of rows) {
    const cid = correlationIdOf(r.newValue as Prisma.JsonValue | null);
    if (!cid) {
      buckets.push([r]);
      continue;
    }
    const key = `${cid}::${r.action}`;
    const existing = bucketByKey.get(key);
    if (existing) {
      existing.push(r);
    } else {
      const bucket = [r];
      bucketByKey.set(key, bucket);
      buckets.push(bucket);
    }
  }

  const total = buckets.length;
  const pageBuckets = buckets.slice(offset, offset + limit);

  // Resolve entity labels over ONLY this page's raw rows — one batched
  // query per entity type present, never per row (unchanged from S11).
  // In parallel, the Actor dropdown's full option list: every User with
  // ≥1 audit row, filter-independent so it is stable as the screen pages.
  const pageRows = pageBuckets.flat();
  const [labels, actors] = await Promise.all([
    resolveEntityLabels(pageRows),
    listAuditActors(),
  ]);

  const toEntry = (r: Raw): AuditLogEntryView => ({
    id: r.id,
    action: r.action,
    actorId: r.userId,
    actorName: r.user?.name ?? "(deleted user)",
    entityType: r.entityType,
    entityId: r.entityId,
    entityLabel: labels.get(`${r.entityType}:${r.entityId}`) ?? null,
    oldValue: (r.oldValue ?? null) as Prisma.JsonValue | null,
    newValue: (r.newValue ?? null) as Prisma.JsonValue | null,
    occurredAt: r.occurredAt.toISOString(),
    recordedAt: r.createdAt.toISOString(),
  });

  const items: AuditLogItem[] = pageBuckets.map((bucket) => {
    // A one-row bucket is always a plain row — whether it never had a
    // `correlationId`, or it is a batch that a filter pared down to a
    // single visible line (a corner case; the current filters are all
    // batch-uniform so it does not arise for the screen, but the shape
    // stays honest if it ever does).
    if (bucket.length === 1) {
      return { kind: "single", entry: toEntry(bucket[0]) };
    }
    const entries = bucket.map(toEntry);
    const first = bucket[0];
    const cid = correlationIdOf(first.newValue as Prisma.JsonValue | null)!;
    const uniform = <T,>(pick: (r: Raw) => T): T | null => {
      const v = pick(first);
      return bucket.every((r) => pick(r) === v) ? v : null;
    };
    return {
      kind: "batch",
      correlationId: cid,
      action: first.action,
      actorId: first.userId,
      actorName: first.user?.name ?? "(deleted user)",
      count: bucket.length,
      entityType: uniform((r) => r.entityType),
      subAction: uniform((r) => subActionOf(r.newValue as Prisma.JsonValue | null)),
      occurredAt: first.occurredAt.toISOString(),
      entries,
    };
  });

  return {
    items,
    actors,
    page: {
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
    },
  };
}

/**
 * Every `User` that has appended at least one `AuditLog` row, `{ id,
 * name }`, name-sorted — the Audit-trail Actor filter's option list (M5
 * S15). One grouped query on the indexed `user_id` column; independent
 * of the current filter.
 */
async function listAuditActors(): Promise<{ id: string; name: string }[]> {
  const groups = await prisma.auditLog.groupBy({
    by: ["userId"],
  });
  if (groups.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((g) => g.userId) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

/**
 * Build a `"entityType:entityId" -> label` map with ONE query per entity
 * type present on `rows` (never per row). Types we cannot resolve cheaply
 * are simply absent from the map (the caller renders a fallback).
 *
 * Resolvable: `order` (→ "KES <total>"), `handover` (→ "<location>,
 * <date>"), `expense` (→ "<category> KES <amount>"), `staff` / `staff_payout`
 * (→ staff name), `stock_movement` (→ "<product> @ <location>"),
 * `stock_count` (→ "<product> @ <location>"), `customer` (→ name),
 * `day_close` (the id IS the date).
 *
 * NOT cheaply resolvable, left null (documented in the S11 report):
 *   - `order` / `expense` / `handover` `correct` rows whose `entityId` is
 *     the CORRECTION row's id, not the original — still resolves because
 *     the correction row exists in the same table; the label just
 *     describes the correction.
 *   - `money_movement` — an internal ledger row with no user-facing name.
 *   - `receipt_of_handover` — resolves via its parent handover but needs a
 *     join we skip; left null.
 *   - `staff_pay_adjustment` — an advance/deduction line; left null.
 */
async function resolveEntityLabels(
  rows: ReadonlyArray<{ entityType: string; entityId: string }>,
): Promise<Map<string, string>> {
  const idsByType = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!idsByType.has(r.entityType)) idsByType.set(r.entityType, new Set());
    idsByType.get(r.entityType)!.add(r.entityId);
  }

  const out = new Map<string, string>();
  const put = (type: string, id: string, label: string) =>
    out.set(`${type}:${id}`, label);

  const jobs: Promise<void>[] = [];

  const ids = (type: string) => [...(idsByType.get(type) ?? [])];

  if (idsByType.has("day_close")) {
    // The entityId already IS the YYYY-MM-DD business date.
    for (const id of ids("day_close")) put("day_close", id, id);
  }

  if (idsByType.has("order")) {
    jobs.push(
      prisma.order
        .findMany({
          where: { id: { in: ids("order") } },
          select: { id: true, total: true, orderType: true },
        })
        .then((os) => {
          for (const o of os) {
            put("order", o.id, `${o.orderType} · KES ${o.total.toFixed(2)}`);
          }
        }),
    );
  }

  if (idsByType.has("handover")) {
    jobs.push(
      prisma.handover
        .findMany({
          where: { id: { in: ids("handover") } },
          select: {
            id: true,
            occurredAt: true,
            location: { select: { name: true } },
          },
        })
        .then((hs) => {
          for (const h of hs) {
            put(
              "handover",
              h.id,
              `${h.location?.name ?? "?"} · ${h.occurredAt
                .toISOString()
                .slice(0, 10)}`,
            );
          }
        }),
    );
  }

  if (idsByType.has("expense")) {
    jobs.push(
      prisma.expense
        .findMany({
          where: { id: { in: ids("expense") } },
          select: { id: true, category: true, amount: true },
        })
        .then((es) => {
          for (const e of es) {
            put("expense", e.id, `${e.category} · KES ${e.amount.toFixed(2)}`);
          }
        }),
    );
  }

  if (idsByType.has("customer")) {
    jobs.push(
      prisma.customer
        .findMany({
          where: { id: { in: ids("customer") } },
          select: { id: true, name: true },
        })
        .then((cs) => {
          for (const c of cs) put("customer", c.id, c.name);
        }),
    );
  }

  if (idsByType.has("staff")) {
    jobs.push(
      prisma.staff
        .findMany({
          where: { id: { in: ids("staff") } },
          select: { id: true, name: true },
        })
        .then((ss) => {
          for (const s of ss) put("staff", s.id, s.name);
        }),
    );
  }

  if (idsByType.has("staff_payout")) {
    jobs.push(
      prisma.staffPayout
        .findMany({
          where: { id: { in: ids("staff_payout") } },
          select: {
            id: true,
            netPaid: true,
            month: true,
            staff: { select: { name: true } },
          },
        })
        .then((ps) => {
          for (const p of ps) {
            put(
              "staff_payout",
              p.id,
              `${p.staff?.name ?? "?"} · ${p.month
                .toISOString()
                .slice(0, 7)} · KES ${p.netPaid.toFixed(2)}`,
            );
          }
        }),
    );
  }

  if (idsByType.has("stock_movement")) {
    jobs.push(
      prisma.stockMovement
        .findMany({
          where: { id: { in: ids("stock_movement") } },
          select: {
            id: true,
            movementType: true,
            quantity: true,
            product: { select: { name: true } },
            location: { select: { name: true } },
          },
        })
        .then((ms) => {
          for (const m of ms) {
            put(
              "stock_movement",
              m.id,
              `${m.movementType} · ${m.product?.name ?? "?"} @ ${
                m.location?.name ?? "?"
              } · ${m.quantity.toFixed(4)}`,
            );
          }
        }),
    );
  }

  if (idsByType.has("stock_count")) {
    jobs.push(
      prisma.stockCount
        .findMany({
          where: { id: { in: ids("stock_count") } },
          select: {
            id: true,
            product: { select: { name: true } },
            location: { select: { name: true } },
          },
        })
        .then((cs) => {
          for (const c of cs) {
            put(
              "stock_count",
              c.id,
              `${c.product?.name ?? "?"} @ ${c.location?.name ?? "?"}`,
            );
          }
        }),
    );
  }

  await Promise.all(jobs);
  return out;
}
