// @vitest-environment jsdom
// M7 — Admin role-switching, Session 3: the desktop staff sidebar shell.
//
// It renders ONLY while an Admin is acting as a staff role (owner 2026-09-06):
// a real staff user (actingAs null) keeps the mobile-first bottom-nav shell at
// every width. This spec covers that scoping guard and the sidebar nav
// contract — not the pixels.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { StaffDesktopShell } from "@/components/shells/staff-desktop-shell";
import { ActingAsError } from "@/app/admin/use-acting-as";

const hookState = {
  actingAs: null as string | null,
  locationName: null as string | null,
  pending: false,
  error: null as ActingAsError | null,
  switchTo: vi.fn(),
  exit: vi.fn(),
};

vi.mock("@/app/admin/use-acting-as", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/admin/use-acting-as")>();
  return { ...actual, useActingAs: () => hookState };
});

// next/navigation + next-auth are pulled in by StaffShellClient's tree.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/store-manager",
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: null, update: vi.fn() }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  hookState.actingAs = null;
  hookState.switchTo = vi.fn().mockResolvedValue(undefined);
  hookState.exit = vi.fn().mockResolvedValue(undefined);
  push.mockClear();
});

// Imported AFTER the mocks are registered.
import { StaffShellClient } from "@/components/layout/staff-shell-client";

describe("StaffDesktopShell", () => {
  it("renders the role's nav rows and routes on click", () => {
    const onNavigate = vi.fn();
    render(
      <StaffDesktopShell
        roleLabel="Store Manager"
        accountInitials="EK"
        navItems={[
          { key: "hub", label: "Hub", href: "/store-manager", icon: <svg /> },
          { key: "stock", label: "Stock", href: "/store-manager/stock", icon: <svg /> },
        ]}
        activeNavKey="hub"
        onNavigate={onNavigate}
        onAccountClick={vi.fn()}
      >
        <p>body</p>
      </StaffDesktopShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByText("Hub")).toBeInTheDocument();
    expect(within(nav).getByText("Store Manager")).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: /Stock/ }));
    expect(onNavigate).toHaveBeenCalledWith("stock");
  });

  it("marks the active row with aria-current", () => {
    render(
      <StaffDesktopShell
        roleLabel="Cashier"
        accountInitials="EK"
        navItems={[{ key: "today", label: "Today", href: "/cashier", icon: <svg /> }]}
        activeNavKey="today"
        onNavigate={vi.fn()}
        onAccountClick={vi.fn()}
      >
        <p>body</p>
      </StaffDesktopShell>,
    );
    expect(screen.getByRole("button", { name: /Today/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("has no workspace switcher trigger in the footer", () => {
    render(
      <StaffDesktopShell
        roleLabel="Store Manager"
        accountInitials="EK"
        navItems={[]}
        activeNavKey=""
        onNavigate={vi.fn()}
        onAccountClick={vi.fn()}
      >
        <p>body</p>
      </StaffDesktopShell>,
    );
    expect(
      screen.queryByRole("button", { name: /Switch workspace/i }),
    ).toBeNull();
  });
});

describe("StaffShellClient — scoping guard", () => {
  const props = {
    basePath: "/store-manager",
    roleLabel: "Store Manager",
    locationLabel: "Store",
    accountInitials: "EK",
  };

  it("a real staff user (actingAs null) gets no desktop sidebar", () => {
    hookState.actingAs = null;
    render(
      <StaffShellClient {...props}>
        <p>body</p>
      </StaffShellClient>,
    );
    // The desktop sidebar is the only chrome with the "Prosper" brand row and
    // a footer "Sign out" button; the mobile bottom-nav shell has neither.
    expect(screen.queryByText("Prosper")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("an Admin acting-as gets the desktop sidebar (plus the mobile mount)", () => {
    hookState.actingAs = "store_manager";
    render(
      <StaffShellClient {...props}>
        <p>body</p>
      </StaffShellClient>,
    );
    expect(screen.getByText("Prosper")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});
