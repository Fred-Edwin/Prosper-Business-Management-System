import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createCustomer } from "./create-customer";
import { listCustomers } from "./list-customers";
import { archiveCustomer, unarchiveCustomer } from "./archive-customer";
import {
  cleanupCustomersTestData,
  setupCustomersTestData,
  type CustomersTestCtx,
} from "./test-helpers";

const SCOPE = "archive";

describe("archive-customer", () => {
  let ctx: CustomersTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupCustomersTestData(SCOPE);
    P = ctx.prefix;
  });

  afterAll(async () => {
    await cleanupCustomersTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("archiveCustomer sets deletedAt and drops the customer from a non-archived listing", async () => {
    const c = await createCustomer(
      { name: `${P}Archive`, phone: "0700000030" },
      { actorId: ctx.adminId },
    );

    await archiveCustomer(c.id);

    const row = await prisma.customer.findUnique({ where: { id: c.id } });
    expect(row?.deletedAt).not.toBeNull();

    const defaultRows = await listCustomers({ search: `${P}Archive` });
    expect(defaultRows).toHaveLength(0);

    const withArchived = await listCustomers({
      search: `${P}Archive`,
      includeArchived: true,
    });
    expect(withArchived).toHaveLength(1);
    expect(withArchived[0].archivedAt).not.toBeNull();
  });

  it("archiveCustomer is idempotent and NOT_FOUND on a missing customer", async () => {
    const c = await createCustomer(
      { name: `${P}Idempotent`, phone: "0700000031" },
      { actorId: ctx.adminId },
    );
    await archiveCustomer(c.id);
    await expect(archiveCustomer(c.id)).resolves.toBeUndefined();
    await expect(archiveCustomer("does-not-exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unarchiveCustomer clears deletedAt and the customer returns to the default listing", async () => {
    const c = await createCustomer(
      { name: `${P}Unarchive`, phone: "0700000032" },
      { actorId: ctx.adminId },
    );
    await archiveCustomer(c.id);
    await unarchiveCustomer(c.id);

    const row = await prisma.customer.findUnique({ where: { id: c.id } });
    expect(row?.deletedAt).toBeNull();

    const rows = await listCustomers({ search: `${P}Unarchive` });
    expect(rows).toHaveLength(1);
    expect(rows[0].archivedAt).toBeNull();
  });

  it("unarchiveCustomer is idempotent on an active customer and NOT_FOUND on a missing one", async () => {
    const c = await createCustomer(
      { name: `${P}AlreadyActive`, phone: "0700000033" },
      { actorId: ctx.adminId },
    );
    await expect(unarchiveCustomer(c.id)).resolves.toBeUndefined();
    await expect(unarchiveCustomer("does-not-exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
