import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { toBusinessDate } from "@/lib/time";
import { declareHandover } from "./declare-handover";
import { editOwnHandover } from "./edit-own-handover";
import { recordReceipt } from "./record-receipt";
import { correctHandover } from "./correct-handover";
import { correctReceipt } from "./correct-receipt";
import { listHandovers } from "./list-handovers";
import { getReconciliation } from "./get-reconciliation";
import {
  cleanupHandoversTestData,
  setupHandoversTestData,
  type HandoversTestCtx,
} from "./test-helpers";

const SCOPE = "core";

/** A far-past date this suite seals; kept well away from other suites. */
const SEALED_DATE = "2019-04-04";

describe("handovers domain", () => {
  let ctx: HandoversTestCtx;
  let cashier: { userId: string; role: "cashier" };
  let cashier2: { userId: string; role: "cashier" };
  let admin: { userId: string; role: "admin" };

  beforeEach(async () => {
    ctx = await setupHandoversTestData(SCOPE);
    cashier = { userId: ctx.cashierId, role: "cashier" };
    cashier2 = { userId: ctx.cashier2Id, role: "cashier" };
    admin = { userId: ctx.adminId, role: "admin" };
  });
  afterEach(async () => {
    await cleanupHandoversTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── declare ───────────────────────────────────────────────────────────

  it("declareHandover: staff declares for their own location + business date", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1200.00" },
      cashier,
    );
    expect(h.staffId).toBe(ctx.cashierStaffId);
    expect(h.locationId).toBe(ctx.restaurantId);
    expect(h.cashDeclared).toBe("5000.00");
    expect(h.mpesaDeclared).toBe("1200.00");
    expect(h.receipts).toHaveLength(0);
  });

  it("declareHandover: a staff member with no Staff link → FORBIDDEN", async () => {
    const orphan = await prisma.user.create({
      data: {
        name: `${ctx.prefix} Orphan`,
        pinHash: "x",
        role: "cashier",
        active: true,
      },
    });
    await expect(
      declareHandover(
        { cashDeclared: "10.00", mpesaDeclared: "0.00" },
        { userId: orphan.id, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("declareHandover: staff blocked when today is closed (day-close gate, ADR-52)", async () => {
    const today = toBusinessDate(new Date());
    await prisma.dayClose.create({
      data: {
        date: new Date(`${today}T00:00:00Z`),
        closedBy: ctx.adminId,
      },
    });
    try {
      await expect(
        declareHandover(
          { cashDeclared: "100.00", mpesaDeclared: "0.00" },
          cashier,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await prisma.dayClose.deleteMany({ where: { closedBy: ctx.adminId } });
    }
  });

  it("declareHandover: staff blocked from backdating to any non-today date (ADR-53)", async () => {
    await expect(
      declareHandover(
        {
          cashDeclared: "100.00",
          mpesaDeclared: "0.00",
          occurredAt: new Date("2019-06-06T09:00:00+03:00"),
        },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("declareHandover: negative amount → VALIDATION_ERROR", async () => {
    await expect(
      declareHandover(
        { cashDeclared: "-1.00", mpesaDeclared: "0.00" },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "cashDeclared" });
  });

  // ── edit own ──────────────────────────────────────────────────────────

  it("editOwnHandover: owner rewrites the figures before a receipt exists", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    const edited = await editOwnHandover(
      h.id,
      { cashDeclared: "4800.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    expect(edited.cashDeclared).toBe("4800.00");
  });

  it("editOwnHandover: another staff member's handover → FORBIDDEN", async () => {
    const h = await declareHandover(
      { cashDeclared: "100.00", mpesaDeclared: "0.00" },
      cashier,
    );
    await expect(
      editOwnHandover(
        h.id,
        { cashDeclared: "90.00", mpesaDeclared: "0.00" },
        cashier2,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("editOwnHandover: after a receipt is recorded → CONFLICT", async () => {
    const h = await declareHandover(
      { cashDeclared: "500.00", mpesaDeclared: "0.00" },
      cashier,
    );
    await recordReceipt(
      { handoverId: h.id, cashReceived: "500.00", mpesaReceived: "0.00" },
      admin,
    );
    await expect(
      editOwnHandover(
        h.id,
        { cashDeclared: "400.00", mpesaDeclared: "0.00" },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  // ── record receipt: variance math ─────────────────────────────────────

  it("recordReceipt: exact match → zero variance on both channels", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1200.00" },
      cashier,
    );
    const withReceipt = await recordReceipt(
      { handoverId: h.id, cashReceived: "5000.00", mpesaReceived: "1200.00" },
      admin,
    );
    const r = withReceipt.receipts[0];
    expect(r.cashVariance).toBe("0.00");
    expect(r.mpesaVariance).toBe("0.00");
    expect(r.shortfalls).toHaveLength(0);
  });

  it("recordReceipt: over (received > declared) → positive variance, no note needed", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    const withReceipt = await recordReceipt(
      { handoverId: h.id, cashReceived: "5050.00", mpesaReceived: "1000.00" },
      admin,
    );
    const r = withReceipt.receipts[0];
    expect(r.cashVariance).toBe("50.00");
    expect(r.mpesaVariance).toBe("0.00");
    expect(r.shortfalls).toHaveLength(0);
  });

  it("recordReceipt: short (received < declared) → negative variance + required note → HandoverShortfall", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    const withReceipt = await recordReceipt(
      {
        handoverId: h.id,
        cashReceived: "4700.00",
        mpesaReceived: "1000.00",
        shortfallNote: "KES 300 short — following up with cashier",
      },
      admin,
    );
    const r = withReceipt.receipts[0];
    expect(r.cashVariance).toBe("-300.00");
    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0].staffId).toBe(ctx.cashierStaffId);
    expect(r.shortfalls[0].note).toContain("300 short");
  });

  it("recordReceipt: short with NO note → VALIDATION_ERROR on shortfallNote, nothing written", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await expect(
      recordReceipt(
        { handoverId: h.id, cashReceived: "4900.00", mpesaReceived: "1000.00" },
        admin,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "shortfallNote",
    });
    const receipts = await prisma.receiptOfHandover.findMany({
      where: { handoverId: h.id },
    });
    expect(receipts).toHaveLength(0);
  });

  it("recordReceipt: writes NO MoneyMovement (ADR-54 — custody transfer, not revenue)", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await recordReceipt(
      { handoverId: h.id, cashReceived: "5000.00", mpesaReceived: "1000.00" },
      admin,
    );
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "handover_receipt" },
    });
    expect(mm).toHaveLength(0);
  });

  it("recordReceipt: second receipt for the same handover → CONFLICT", async () => {
    const h = await declareHandover(
      { cashDeclared: "100.00", mpesaDeclared: "0.00" },
      cashier,
    );
    await recordReceipt(
      { handoverId: h.id, cashReceived: "100.00", mpesaReceived: "0.00" },
      admin,
    );
    await expect(
      recordReceipt(
        { handoverId: h.id, cashReceived: "100.00", mpesaReceived: "0.00" },
        admin,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("recordReceipt: variance is computed against the CURRENT DERIVED declared (after a correction)", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    // Admin corrects the declaration up to 5200 before recording receipt.
    await correctHandover(
      { handoverId: h.id, cashDeclared: "5200.00", mpesaDeclared: "1000.00" },
      admin,
    );
    const withReceipt = await recordReceipt(
      { handoverId: h.id, cashReceived: "5200.00", mpesaReceived: "1000.00" },
      admin,
    );
    // received 5200 vs derived declared 5200 → zero, not +200 vs the
    // original 5000.
    expect(withReceipt.receipts[0].cashVariance).toBe("0.00");
    expect(withReceipt.cashDeclared).toBe("5200.00");
  });

  // ── corrections ───────────────────────────────────────────────────────

  it("correctHandover: writes an append-only delta row; derived declared reflects it", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    const corrected = await correctHandover(
      { handoverId: h.id, cashDeclared: "4800.00", mpesaDeclared: "1100.00" },
      admin,
    );
    expect(corrected.id).toBe(h.id); // view is of the original
    expect(corrected.cashDeclared).toBe("4800.00");
    expect(corrected.mpesaDeclared).toBe("1100.00");

    const rows = await prisma.handover.findMany({
      where: { correctsHandoverId: h.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cashDeclared.toFixed(2)).toBe("-200.00");
    expect(rows[0].mpesaDeclared.toFixed(2)).toBe("100.00");
    // original untouched
    const original = await prisma.handover.findUniqueOrThrow({
      where: { id: h.id },
    });
    expect(original.cashDeclared.toFixed(2)).toBe("5000.00");
  });

  it("correctHandover: re-submitting the same figures → delta 0 → VALIDATION_ERROR (no stacking)", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await correctHandover(
      { handoverId: h.id, cashDeclared: "4800.00", mpesaDeclared: "1000.00" },
      admin,
    );
    // second identical correction: current derived is already 4800/1000.
    await expect(
      correctHandover(
        { handoverId: h.id, cashDeclared: "4800.00", mpesaDeclared: "1000.00" },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const rows = await prisma.handover.findMany({
      where: { correctsHandoverId: h.id },
    });
    expect(rows).toHaveLength(1); // still just the one delta row
  });

  it("correctHandover: cannot correct a correction row", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await correctHandover(
      { handoverId: h.id, cashDeclared: "4800.00", mpesaDeclared: "1000.00" },
      admin,
    );
    const deltaRow = await prisma.handover.findFirstOrThrow({
      where: { correctsHandoverId: h.id },
    });
    await expect(
      correctHandover(
        {
          handoverId: deltaRow.id,
          cashDeclared: "4700.00",
          mpesaDeclared: "1000.00",
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "handoverId" });
  });

  it("correctReceipt: new receipt row with recomputed stored variance; latest wins", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    const withReceipt = await recordReceipt(
      {
        handoverId: h.id,
        cashReceived: "4700.00",
        mpesaReceived: "1000.00",
        shortfallNote: "300 short",
      },
      admin,
    );
    const firstReceiptId = withReceipt.receipts[0].id;

    const afterCorrection = await correctReceipt(
      {
        receiptId: firstReceiptId,
        cashReceived: "5000.00",
        mpesaReceived: "1000.00",
      },
      admin,
    );
    // two receipt rows on record (append-only), latest has zero variance
    expect(afterCorrection.receipts).toHaveLength(2);
    const recon = await getReconciliation(SEALED_DATE);
    // (SEALED_DATE has no rows — use the handover's own date instead)
    const today = toBusinessDate(new Date());
    const reconToday = await getReconciliation(today);
    const row = reconToday.rows.find((r) => r.handoverId === h.id);
    expect(row?.cashVariance).toBe("0.00");
    expect(row?.cashReceived).toBe("5000.00");
    expect(recon.rows).toHaveLength(0);
  });

  it("correctReceipt: correcting a superseded receipt → VALIDATION_ERROR", async () => {
    const h = await declareHandover(
      { cashDeclared: "100.00", mpesaDeclared: "0.00" },
      cashier,
    );
    const withReceipt = await recordReceipt(
      { handoverId: h.id, cashReceived: "100.00", mpesaReceived: "0.00" },
      admin,
    );
    const firstId = withReceipt.receipts[0].id;
    await correctReceipt(
      { receiptId: firstId, cashReceived: "110.00", mpesaReceived: "0.00" },
      admin,
    );
    await expect(
      correctReceipt(
        { receiptId: firstId, cashReceived: "120.00", mpesaReceived: "0.00" },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  // ── corrections work on a CLOSED day ──────────────────────────────────

  it("correctHandover: Admin correction works on a closed day (not day-close gated)", async () => {
    // Seed a handover dated to the sealed date directly (a staff member
    // could have declared it while the day was open), then seal the day.
    const seeded = await prisma.handover.create({
      data: {
        staffId: ctx.cashierStaffId,
        locationId: ctx.restaurantId,
        cashDeclared: "5000.00",
        mpesaDeclared: "1000.00",
        occurredAt: new Date(`${SEALED_DATE}T09:00:00+03:00`),
      },
    });
    const h = { id: seeded.id };
    await prisma.dayClose.create({
      data: { date: new Date(`${SEALED_DATE}T00:00:00Z`), closedBy: ctx.adminId },
    });

    const corrected = await correctHandover(
      { handoverId: h.id, cashDeclared: "4900.00", mpesaDeclared: "1000.00" },
      admin,
    );
    expect(corrected.cashDeclared).toBe("4900.00");
  });

  // ── list read: role scoping ───────────────────────────────────────────

  it("listHandovers: staff see only their own; Admin sees all", async () => {
    const hA = await declareHandover(
      { cashDeclared: "100.00", mpesaDeclared: "0.00" },
      cashier,
    );
    const hB = await declareHandover(
      { cashDeclared: "200.00", mpesaDeclared: "0.00" },
      cashier2,
    );

    const asCashierA = await listHandovers({}, cashier);
    expect(asCashierA.map((h) => h.id)).toEqual([hA.id]);

    const asCashierB = await listHandovers({}, cashier2);
    expect(asCashierB.map((h) => h.id)).toEqual([hB.id]);

    const asAdmin = await listHandovers({}, admin);
    expect(asAdmin.map((h) => h.id).sort()).toEqual([hA.id, hB.id].sort());
  });

  it("listHandovers: correction rows are not listed; the original carries derived figures", async () => {
    const h = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await correctHandover(
      { handoverId: h.id, cashDeclared: "4800.00", mpesaDeclared: "1000.00" },
      admin,
    );
    const rows = await listHandovers({}, admin);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(h.id);
    expect(rows[0].cashDeclared).toBe("4800.00");
  });

  it("listHandovers: a role with no handover access → FORBIDDEN", async () => {
    const sm = await prisma.user.create({
      data: {
        name: `${ctx.prefix} SM`,
        pinHash: "x",
        role: "store_manager",
        active: true,
      },
    });
    await expect(
      listHandovers({}, { userId: sm.id, role: "store_manager" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // ── reconciliation read ───────────────────────────────────────────────

  it("getReconciliation: declared vs received vs stored variance per handover + totals", async () => {
    const today = toBusinessDate(new Date());
    const h1 = await declareHandover(
      { cashDeclared: "5000.00", mpesaDeclared: "1000.00" },
      cashier,
    );
    await declareHandover(
      { cashDeclared: "3000.00", mpesaDeclared: "500.00" },
      cashier2,
    );
    await recordReceipt(
      {
        handoverId: h1.id,
        cashReceived: "4900.00",
        mpesaReceived: "1000.00",
        shortfallNote: "100 short",
      },
      admin,
    );

    const recon = await getReconciliation(today);
    expect(recon.rows).toHaveLength(2);

    const r1 = recon.rows.find((r) => r.handoverId === h1.id)!;
    expect(r1.cashDeclared).toBe("5000.00");
    expect(r1.cashReceived).toBe("4900.00");
    expect(r1.cashVariance).toBe("-100.00");
    expect(r1.received).toBe(true);
    expect(r1.shortfallNotes).toEqual(["100 short"]);

    const r2 = recon.rows.find((r) => r.handoverId !== h1.id)!;
    expect(r2.received).toBe(false);
    expect(r2.cashReceived).toBeNull();
    expect(r2.cashVariance).toBeNull();

    expect(recon.totals.cashDeclared).toBe("8000.00");
    expect(recon.totals.cashReceived).toBe("4900.00");
    expect(recon.totals.cashVariance).toBe("-100.00");
  });
});
