import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

/**
 * The one subtlety of Admin role-switching that needs its own test
 * (`docs/sprints/role-switching-session-1-handoff.md`):
 *
 *   `requireApiRole("admin")` MUST keep checking the real
 *   `session.user.role`, never `effectiveRole`. An Admin who switched to
 *   Store Manager must still reach `/api/admin/*` (including the switcher
 *   itself). A real Store Manager never can.
 *
 * The `effectiveRole`-aware `requireActingRole` / `requireActingRoleIn`
 * are the opposite: they admit an Admin acting as that staff role.
 */

const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function session(role: string, actingAs: string | null = null) {
  return {
    user: { id: "u1", name: role, role, active: true, actingAs, actingLocationId: null },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

async function loadModule() {
  return import("./require-role");
}
async function loadModuleIn() {
  return import("./require-role-in");
}

describe("requireApiRole('admin') checks the REAL role, not effectiveRole", () => {
  it("admin acting as store_manager still passes", async () => {
    const { requireApiRole } = await loadModule();
    mockSession.current = session("admin", "store_manager");
    const res = await requireApiRole("admin");
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it("a real store_manager is rejected (403)", async () => {
    const { requireApiRole } = await loadModule();
    mockSession.current = session("store_manager");
    const res = await requireApiRole("admin");
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(403);
  });

  it("a real store_manager cannot reach admin routes by 'acting as' admin (impossible state, but defensive)", async () => {
    const { requireApiRole } = await loadModule();
    mockSession.current = session("store_manager", "admin");
    const res = await requireApiRole("admin");
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(403);
  });
});

describe("requireActingRole checks effectiveRole", () => {
  it("admin acting as store_manager passes requireActingRole('store_manager')", async () => {
    const { requireActingRole } = await loadModule();
    mockSession.current = session("admin", "store_manager");
    const res = await requireActingRole("store_manager");
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it("admin NOT acting as anyone is rejected by requireActingRole('store_manager')", async () => {
    const { requireActingRole } = await loadModule();
    mockSession.current = session("admin");
    const res = await requireActingRole("store_manager");
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(403);
  });

  it("a real store_manager passes requireActingRole('store_manager')", async () => {
    const { requireActingRole } = await loadModule();
    mockSession.current = session("store_manager");
    const res = await requireActingRole("store_manager");
    expect(res).not.toBeInstanceOf(NextResponse);
  });
});

describe("requireActingRoleIn checks effectiveRole", () => {
  it("admin acting as canteen_attendant is admitted to a staff set", async () => {
    const { requireActingRoleIn } = await loadModuleIn();
    mockSession.current = session("admin", "canteen_attendant");
    const res = await requireActingRoleIn(["store_manager", "canteen_attendant"]);
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it("admin acting as cashier is NOT in a {store_manager, canteen_attendant} set", async () => {
    const { requireActingRoleIn } = await loadModuleIn();
    mockSession.current = session("admin", "cashier");
    const res = await requireActingRoleIn(["store_manager", "canteen_attendant"]);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(403);
  });
});
