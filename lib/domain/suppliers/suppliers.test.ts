import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createSupplier } from "./create-supplier";
import { listSuppliers } from "./list-suppliers";
import { archiveSupplier, unarchiveSupplier } from "./archive-supplier";

// Vitest runs test files in parallel workers against the one local Postgres
// (the `lib/domain/customers` pattern) — namespace rows with a unique
// prefix and only clean up this suite's own.
const PREFIX = "__suppliers_test__";

async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  await prisma.supplier.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

describe("suppliers domain", () => {
  let adminId: string;

  beforeAll(async () => {
    await cleanup();
    const admin = await prisma.user.create({
      data: { name: `${PREFIX}Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe("createSupplier", () => {
    it("trims name/phone/note and writes an audit row", async () => {
      const s = await createSupplier(
        { name: `  ${PREFIX}Farmer's Choice  `, phone: "  0712 345 678  " },
        { actorId: adminId },
      );
      expect(s.name).toBe(`${PREFIX}Farmer's Choice`);
      expect(s.phone).toBe("0712 345 678");
      expect(s.archivedAt).toBeNull();

      const audit = await prisma.auditLog.findMany({
        where: { entityType: "supplier", entityId: s.id },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe("create");
    });

    it("rejects an empty name", async () => {
      await expect(
        createSupplier({ name: "   " }, { actorId: adminId }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "name" });
    });

    it("allows an omitted phone/note", async () => {
      const s = await createSupplier(
        { name: `${PREFIX}NoContact` },
        { actorId: adminId },
      );
      expect(s.phone).toBeNull();
      expect(s.note).toBeNull();
    });
  });

  describe("listSuppliers", () => {
    it("matches name case-insensitively and sorts by name", async () => {
      await createSupplier({ name: `${PREFIX}Zeta Wholesale` }, { actorId: adminId });
      await createSupplier({ name: `${PREFIX}Alpha Wholesale` }, { actorId: adminId });

      const rows = await listSuppliers({ search: `${PREFIX.toUpperCase()}` });
      const names = rows.map((r) => r.name);
      expect(names).toContain(`${PREFIX}Zeta Wholesale`);
      expect(names.indexOf(`${PREFIX}Alpha Wholesale`)).toBeLessThan(
        names.indexOf(`${PREFIX}Zeta Wholesale`),
      );
    });

    it("excludes archived suppliers unless includeArchived is set", async () => {
      const s = await createSupplier(
        { name: `${PREFIX}ArchiveMe` },
        { actorId: adminId },
      );
      await archiveSupplier(s.id);

      const defaultRows = await listSuppliers({ search: `${PREFIX}ArchiveMe` });
      expect(defaultRows).toHaveLength(0);

      const withArchived = await listSuppliers({
        search: `${PREFIX}ArchiveMe`,
        includeArchived: true,
      });
      expect(withArchived).toHaveLength(1);
      expect(withArchived[0].archivedAt).not.toBeNull();
    });
  });

  describe("archiveSupplier / unarchiveSupplier", () => {
    it("is idempotent and NOT_FOUND on a missing supplier", async () => {
      const s = await createSupplier(
        { name: `${PREFIX}Idempotent` },
        { actorId: adminId },
      );
      await archiveSupplier(s.id);
      await expect(archiveSupplier(s.id)).resolves.toBeUndefined();
      await expect(archiveSupplier("does-not-exist")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("unarchive clears deletedAt and returns the supplier to the default listing", async () => {
      const s = await createSupplier(
        { name: `${PREFIX}Unarchive` },
        { actorId: adminId },
      );
      await archiveSupplier(s.id);
      await unarchiveSupplier(s.id);

      const rows = await listSuppliers({ search: `${PREFIX}Unarchive` });
      expect(rows).toHaveLength(1);
      expect(rows[0].archivedAt).toBeNull();
    });

    it("unarchive is idempotent on an active supplier and NOT_FOUND on a missing one", async () => {
      const s = await createSupplier(
        { name: `${PREFIX}AlreadyActive` },
        { actorId: adminId },
      );
      await expect(unarchiveSupplier(s.id)).resolves.toBeUndefined();
      await expect(unarchiveSupplier("does-not-exist")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
