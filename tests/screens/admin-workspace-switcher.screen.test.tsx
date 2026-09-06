// @vitest-environment jsdom
// M7 — Admin role-switching ("acting as", NOT impersonation).
//
// Covers the interaction contract of the switcher popover, the acting-as
// banner, and the shell triggers — not the pixels:
//   - the switcher lists Admin + the three staff roles, checks the current
//     one, and calls switchTo / exit
//   - the current workspace row is not a control (no double-switch)
//   - a resolve/validation error surfaces in the panel
//   - the banner renders only while acting-as, exits on click, and shows
//     the location name
//   - a real staff user (actingAs null) sees no banner and no hamburger
//   - the desktop sidebar footer chevron opens the popover
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { AdminToolbarProvider } from "@/components/shells/admin-toolbar-context";
import { AdminShell } from "@/components/shells/admin-shell";
import { StaffShell } from "@/components/shells/staff-shell";
import { ActingAsError } from "@/app/admin/use-acting-as";

// The hook is exercised end-to-end by its own consumers; here we drive the
// UI off a controllable fake so the specs stay about the interaction.
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
  return {
    ...actual,
    useActingAs: () => hookState,
  };
});

// createPortal target + a stable viewport for the anchored popover math.
beforeEach(() => {
  hookState.actingAs = null;
  hookState.locationName = null;
  hookState.pending = false;
  hookState.error = null;
  hookState.switchTo = vi.fn().mockResolvedValue(undefined);
  hookState.exit = vi.fn().mockResolvedValue(undefined);
});

// Imported AFTER the mock is registered.
import { WorkspaceSwitcher } from "@/app/admin/workspace-switcher";
import { ActingAsBanner } from "@/components/layout/acting-as-banner";

describe("WorkspaceSwitcher popover", () => {
  it("lists Admin + the three staff roles", () => {
    render(<WorkspaceSwitcher open onClose={() => {}} placement="inline" />);
    const menu = screen.getByRole("menu", { name: "Switch workspace" });
    expect(within(menu).getByText("Admin")).toBeInTheDocument();
    expect(within(menu).getByText("Store Manager")).toBeInTheDocument();
    expect(within(menu).getByText("Cashier")).toBeInTheDocument();
    expect(within(menu).getByText("Canteen Attendant")).toBeInTheDocument();
  });

  it("marks the current workspace and makes it non-interactive", () => {
    hookState.actingAs = null; // normal Admin
    render(<WorkspaceSwitcher open onClose={() => {}} placement="inline" />);
    // Admin row is aria-current and NOT a button.
    const adminRow = screen.getByText("Admin").closest("[aria-current='true']");
    expect(adminRow).not.toBeNull();
    expect(screen.queryByRole("menuitem", { name: /Admin/ })).toBeNull();
  });

  it("switches into a staff role", () => {
    render(<WorkspaceSwitcher open onClose={() => {}} placement="inline" />);
    fireEvent.click(screen.getByRole("menuitem", { name: /Store Manager/ }));
    expect(hookState.switchTo).toHaveBeenCalledWith("store_manager");
  });

  it("exits when the Admin row is chosen while acting-as", () => {
    hookState.actingAs = "cashier";
    render(<WorkspaceSwitcher open onClose={() => {}} placement="inline" />);
    // Now the Admin row IS a control (not current); Cashier is current.
    fireEvent.click(screen.getByRole("menuitem", { name: /^Admin/ }));
    expect(hookState.exit).toHaveBeenCalled();
    expect(screen.getByText("Cashier").closest("[aria-current='true']")).not.toBeNull();
  });

  it("surfaces a resolve error inside the panel", () => {
    hookState.error = new ActingAsError({
      code: "VALIDATION_ERROR",
      message: "raw",
      field: "locationId",
    });
    render(<WorkspaceSwitcher open onClose={() => {}} placement="inline" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That role has no active location set up yet.",
    );
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <WorkspaceSwitcher open={false} onClose={() => {}} placement="inline" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ActingAsBanner", () => {
  it("renders nothing for a real staff user (actingAs null)", () => {
    const { container } = render(<ActingAsBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the role + location and exits on click", () => {
    hookState.actingAs = "store_manager";
    hookState.locationName = "Main Store";
    render(<ActingAsBanner />);
    expect(
      screen.getByText(/Acting as Store Manager at Main Store — recorded as Admin/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Exit to Admin" }));
    expect(hookState.exit).toHaveBeenCalled();
  });

  it("uses the short 'Exit' label in mobile density", () => {
    hookState.actingAs = "cashier";
    render(<ActingAsBanner density="mobile" />);
    expect(screen.getByRole("button", { name: "Exit" })).toBeInTheDocument();
  });

  it("falls back to the server-passed location name", () => {
    hookState.actingAs = "canteen_attendant";
    hookState.locationName = null;
    render(<ActingAsBanner locationName="Staff Canteen" />);
    expect(screen.getByText(/at Staff Canteen/)).toBeInTheDocument();
  });
});

describe("shell triggers", () => {
  function renderAdmin(props: Partial<React.ComponentProps<typeof AdminShell>> = {}) {
    render(
      <AdminToolbarProvider>
        <AdminShell
          activeNavKey="dashboard"
          onNavigate={vi.fn()}
          accountName="Admin"
          accountRole="Admin"
          accountInitials="AK"
          onAccountClick={vi.fn()}
          collapsed={false}
          onToggleCollapsed={vi.fn()}
          {...props}
        >
          <p>body</p>
        </AdminShell>
      </AdminToolbarProvider>,
    );
  }

  it("shows the sidebar switcher chevron and reports its rect on click", () => {
    const onSwitchWorkspace = vi.fn();
    renderAdmin({ onSwitchWorkspace });
    const trigger = screen.getByRole("button", { name: "Switch workspace" });
    fireEvent.click(trigger);
    expect(onSwitchWorkspace).toHaveBeenCalledTimes(1);
    expect(onSwitchWorkspace.mock.calls[0][0]).toMatchObject({
      // a DOMRect-shaped object
      top: expect.any(Number),
      left: expect.any(Number),
    });
  });

  it("hides the chevron when no handler is wired (non-Admin shell use)", () => {
    renderAdmin({});
    expect(
      screen.queryByRole("button", { name: "Switch workspace" }),
    ).toBeNull();
  });

  it("staff header shows a hamburger only when onMenuClick is wired", () => {
    const onMenuClick = vi.fn();
    const { rerender } = render(
      <StaffShell
        roleLabel="Store Manager"
        locationLabel="Store"
        accountInitials="AK"
        navItems={[]}
        activeNavKey=""
        onNavigate={vi.fn()}
        onAccountClick={vi.fn()}
      >
        <p>body</p>
      </StaffShell>,
    );
    expect(
      screen.queryByRole("button", { name: "Open workspace menu" }),
    ).toBeNull();

    rerender(
      <StaffShell
        roleLabel="Store Manager"
        locationLabel="Store"
        accountInitials="AK"
        navItems={[]}
        activeNavKey=""
        onNavigate={vi.fn()}
        onAccountClick={vi.fn()}
        onMenuClick={onMenuClick}
      >
        <p>body</p>
      </StaffShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open workspace menu" }));
    expect(onMenuClick).toHaveBeenCalled();
  });
});
