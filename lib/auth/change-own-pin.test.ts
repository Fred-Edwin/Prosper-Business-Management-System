import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { changeOwnPin } from "./change-own-pin";

// Self-service PIN change — any role, including the Admin (who has no
// Staff row, so PATCH /api/staff/:id's Admin-resets-staff-PIN path
// doesn't cover their own account). Exercises the real bcrypt compare +
// hash against the local dev Postgres, mirroring config.test.ts.

describe("changeOwnPin", () => {
  const testUserName = "Test Change Own PIN User";
  let userId: string;

  beforeAll(async () => {
    const pinHash = await bcrypt.hash("1234", 10);
    await prisma.user.deleteMany({ where: { name: testUserName } });
    const user = await prisma.user.create({
      data: { name: testUserName, pinHash, role: "admin", active: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { name: testUserName } });
    await prisma.$disconnect();
  });

  it("changes the PIN when the current PIN is correct", async () => {
    await changeOwnPin(userId, "1234", "5678");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("5678", user.pinHash)).toBe(true);
    expect(user.pinHash.startsWith("$2")).toBe(true);
  });

  it("rejects when the current PIN is wrong, writing nothing", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await expect(changeOwnPin(userId, "0000", "9999")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "currentPin",
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.pinHash).toBe(before.pinHash);
  });

  it("rejects a new PIN that isn't 4 digits", async () => {
    await expect(changeOwnPin(userId, "5678", "12")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "newPin",
    });
  });

  it("rejects a new PIN identical to the current PIN", async () => {
    await expect(changeOwnPin(userId, "5678", "5678")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "newPin",
    });
  });

  it("rejects an unknown user id", async () => {
    await expect(
      changeOwnPin("00000000-0000-0000-0000-000000000000", "1234", "5678"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
