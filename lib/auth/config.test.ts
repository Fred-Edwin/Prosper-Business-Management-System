import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authOptions } from "./config";

// Exercises the real authorize() callback (PIN check + lockout) against
// the local dev Postgres — this is the logic behind the sprint's
// acceptance criterion "a seeded user of each role can log in" and
// "an unauthenticated request redirects to login," at the level below
// the HTTP/session-cookie plumbing (covered manually — see PROGRESS.md).
const credentialsProvider = authOptions.providers[0] as unknown as {
  options: { authorize: (credentials: Record<string, string>) => Promise<unknown> };
};

async function authorize(name: string, pin: string) {
  return credentialsProvider.options.authorize({ name, pin });
}

describe("auth authorize() — PIN login", () => {
  const testUserName = "Test Auth User";

  beforeAll(async () => {
    const pinHash = await bcrypt.hash("4321", 10);
    await prisma.user.deleteMany({ where: { name: testUserName } });
    await prisma.user.create({
      data: {
        name: testUserName,
        pinHash,
        role: "cashier",
        active: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { name: testUserName } });
    await prisma.$disconnect();
  });

  it("returns the user for a correct name + PIN", async () => {
    const result = await authorize(testUserName, "4321");
    expect(result).toMatchObject({ name: testUserName, role: "cashier" });
  });

  it("returns null for a wrong PIN", async () => {
    const result = await authorize(testUserName, "0000");
    expect(result).toBeNull();
  });

  it("returns null for an unknown name", async () => {
    const result = await authorize("Nobody With This Name", "4321");
    expect(result).toBeNull();
  });

  it("resets failed_pin_attempts to 0 after a successful login", async () => {
    await authorize(testUserName, "0000"); // one failed attempt
    await authorize(testUserName, "4321"); // then succeed

    const user = await prisma.user.findUniqueOrThrow({ where: { name: testUserName } });
    expect(user.failedPinAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it("locks the account after repeated failed PIN attempts, even with the correct PIN", async () => {
    for (let i = 0; i < 5; i++) {
      await authorize(testUserName, "0000");
    }

    const locked = await prisma.user.findUniqueOrThrow({ where: { name: testUserName } });
    expect(locked.lockedUntil).not.toBeNull();

    // Correct PIN is rejected while locked.
    const result = await authorize(testUserName, "4321");
    expect(result).toBeNull();
  });

  it("rejects a deactivated user even with the correct PIN", async () => {
    await prisma.user.update({ where: { name: testUserName }, data: { active: false } });

    const result = await authorize(testUserName, "4321");
    expect(result).toBeNull();

    await prisma.user.update({ where: { name: testUserName }, data: { active: true } });
  });
});
