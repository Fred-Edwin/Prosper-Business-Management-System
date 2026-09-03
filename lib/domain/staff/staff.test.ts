import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createStaff } from "./create-staff";
import { updateStaff } from "./update-staff";
import { deactivateStaff } from "./deactivate-staff";
import { getStaff, listStaff } from "./list-staff";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "crud";

describe("staff CRUD + login account", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("createStaff writes BOTH a Staff row and a linked User with a bcrypt PIN, in one tx", async () => {
    const name = `${ctx.prefix} Alice`;
    const view = await createStaff(
      {
        name: `  ${name}  `,
        role: "cashier",
        locationId: ctx.locationAId,
        dailyRate: "550.00",
        pin: "4821",
      },
      admin(),
    );

    expect(view.name).toBe(name); // trimmed
    expect(view.role).toBe("cashier");
    expect(view.locationId).toBe(ctx.locationAId);
    expect(view.dailyRate).toBe("550.00");
    expect(view.active).toBe(true);
    expect(view.userActive).toBe(true);
    expect(view.userId).not.toBeNull();

    // the read shape carries NO pin / hash field at all
    expect(JSON.stringify(view)).not.toMatch(/pin/i);
    expect(JSON.stringify(view)).not.toMatch(/hash/i);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: view.userId! },
    });
    expect(user.name).toBe(name);
    expect(user.role).toBe("cashier");
    expect(user.staffId).toBe(view.id);
    // stored as a bcrypt hash, matching the seed/login scheme — never plaintext
    expect(user.pinHash).not.toBe("4821");
    expect(await bcrypt.compare("4821", user.pinHash)).toBe(true);
    expect(user.pinHash.startsWith("$2")).toBe(true);
  });

  it("createStaff rejects a non-admin actor (FORBIDDEN), writing nothing", async () => {
    const before = await prisma.staff.count();
    await expect(
      createStaff(
        {
          name: `${ctx.prefix} Nope`,
          role: "cashier",
          locationId: ctx.locationAId,
          dailyRate: "550.00",
          pin: "1111",
        },
        { actorId: ctx.adminId, role: "store_manager" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.staff.count()).toBe(before);
  });

  it("createStaff rejects a non-4-digit PIN", async () => {
    await expect(
      createStaff(
        {
          name: `${ctx.prefix} BadPin`,
          role: "cashier",
          locationId: ctx.locationAId,
          dailyRate: "550.00",
          pin: "12a4",
        },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "pin" });
  });

  it("createStaff rejects a duplicate login name (CONFLICT) and an inactive/unknown location", async () => {
    await createStaff(
      {
        name: `${ctx.prefix} Dup`,
        role: "cashier",
        locationId: ctx.locationAId,
        dailyRate: "550.00",
        pin: "2222",
      },
      admin(),
    );
    await expect(
      createStaff(
        {
          name: `${ctx.prefix} Dup`,
          role: "cashier",
          locationId: ctx.locationAId,
          dailyRate: "550.00",
          pin: "3333",
        },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      createStaff(
        {
          name: `${ctx.prefix} InactiveLoc`,
          role: "cashier",
          locationId: ctx.inactiveLocationId,
          dailyRate: "550.00",
          pin: "4444",
        },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "locationId" });
  });

  it("updateStaff reassigns locationId (the role-scoping field) and resets the PIN on the linked User", async () => {
    const created = await createStaff(
      {
        name: `${ctx.prefix} Mover`,
        role: "cashier",
        locationId: ctx.locationAId,
        dailyRate: "550.00",
        pin: "5555",
      },
      admin(),
    );

    const moved = await updateStaff(
      created.id,
      { locationId: ctx.locationBId, pin: "6060", dailyRate: "600.00" },
      admin(),
    );
    expect(moved.locationId).toBe(ctx.locationBId);
    expect(moved.dailyRate).toBe("600.00");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.userId! },
    });
    expect(await bcrypt.compare("6060", user.pinHash)).toBe(true);
    expect(await bcrypt.compare("5555", user.pinHash)).toBe(false);
  });

  it("updateStaff renaming propagates to User.name and rejects a clash", async () => {
    const a = await createStaff(
      { name: `${ctx.prefix} RN-A`, role: "cashier", locationId: ctx.locationAId, dailyRate: "500.00", pin: "1212" },
      admin(),
    );
    await createStaff(
      { name: `${ctx.prefix} RN-B`, role: "cashier", locationId: ctx.locationAId, dailyRate: "500.00", pin: "1313" },
      admin(),
    );

    const renamed = await updateStaff(a.id, { name: `${ctx.prefix} RN-A2` }, admin());
    expect(renamed.name).toBe(`${ctx.prefix} RN-A2`);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: a.userId! } });
    expect(user.name).toBe(`${ctx.prefix} RN-A2`);

    await expect(
      updateStaff(a.id, { name: `${ctx.prefix} RN-B` }, admin()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deactivateStaff soft-deletes AND deactivates the login so they cannot sign in", async () => {
    const created = await createStaff(
      { name: `${ctx.prefix} Leaver`, role: "cashier", locationId: ctx.locationAId, dailyRate: "500.00", pin: "7777" },
      admin(),
    );

    const out = await deactivateStaff(created.id, admin());
    expect(out.active).toBe(false);
    expect(out.userActive).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.userId! },
    });
    // auth (lib/auth/config.ts) gates authorize() on `user.active` — false here means no login
    expect(user.active).toBe(false);

    // idempotent
    const again = await deactivateStaff(created.id, admin());
    expect(again.active).toBe(false);
  });

  it("listStaff / getStaff are read-only and never expose a PIN or hash", async () => {
    await makeBareStaff(ctx, { name: `${ctx.prefix} Bare One` });
    const list = await listStaff({ search: `${ctx.prefix}` });
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) {
      expect(Object.keys(s)).not.toContain("pin");
      expect(Object.keys(s)).not.toContain("pinHash");
      expect(JSON.stringify(s)).not.toMatch(/\$2[aby]\$/); // no bcrypt hash leaked
    }

    const one = list[0];
    const fetched = await getStaff(one.id);
    expect(fetched?.id).toBe(one.id);
    expect(JSON.stringify(fetched)).not.toMatch(/\$2[aby]\$/);

    expect(await getStaff("no-such-id")).toBeNull();
  });

  it("listStaff filters by active flag and locationId", async () => {
    const activeId = await makeBareStaff(ctx, {
      name: `${ctx.prefix} FilterActive`,
      locationId: ctx.locationBId,
      active: true,
    });
    const inactiveId = await makeBareStaff(ctx, {
      name: `${ctx.prefix} FilterInactive`,
      locationId: ctx.locationBId,
      active: false,
    });

    const activeOnly = await listStaff({ active: true, locationId: ctx.locationBId });
    expect(activeOnly.some((s) => s.id === activeId)).toBe(true);
    expect(activeOnly.some((s) => s.id === inactiveId)).toBe(false);
  });
});
