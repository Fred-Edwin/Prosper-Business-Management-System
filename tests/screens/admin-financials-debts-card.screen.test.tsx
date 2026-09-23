// @vitest-environment jsdom
//
// DebtsCard collapsibility — owner feedback 2026-09-23 (Financials felt
// crowded). The toggle hides the customer table but keeps the total
// visible, and the collapsed/expanded choice persists via localStorage
// (COLLAPSE_KEY = "prosper.admin.debtsCardCollapsed"), mirroring
// app/admin/admin-shell-client.tsx's sidebar-collapse precedent.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerListRow } from "@/lib/domain/customers";
import { DebtsCard } from "@/app/admin/financials/debts-card";

const KEY = "prosper.admin.debtsCardCollapsed";

// jsdom's built-in localStorage needs a CLI flag this project's test
// runner doesn't set; the component wraps every read/write in try/catch
// and degrades to "expanded" without it (verified separately), so tests
// that assert persistence need a minimal in-memory shim.
function installLocalStorageShim(): Storage {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
  Object.defineProperty(window, "localStorage", {
    value: shim,
    configurable: true,
  });
  return shim;
}

function customer(over: Partial<CustomerListRow> = {}): CustomerListRow {
  return {
    id: "c1",
    name: "Demo Customer A",
    phone: null,
    balance: "600.00",
    oldestDebtAt: "2026-06-02T00:00:00.000Z",
    ...over,
  } as CustomerListRow;
}

beforeEach(() => {
  installLocalStorageShim();
  vi.clearAllMocks();
});

describe("Admin Financials — Debts card collapsibility", () => {
  it("shows the customer table expanded by default", () => {
    render(
      <DebtsCard
        customers={[customer()]}
        total="600.00"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Demo Customer A")[0]).toBeInTheDocument();
    expect(screen.getByText("KES 600.00")).toBeInTheDocument();
  });

  it("collapses the table on toggle but keeps the total visible", async () => {
    const user = userEvent.setup();
    render(
      <DebtsCard
        customers={[customer()]}
        total="600.00"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Debts owed to the business/ }),
    );

    expect(screen.queryByText("Demo Customer A")).not.toBeInTheDocument();
    expect(screen.queryByText("View all customer credit →")).not.toBeInTheDocument();
    // The total stays visible even when collapsed.
    expect(screen.getByText("KES 600.00")).toBeInTheDocument();
  });

  it("persists the collapsed state to localStorage and restores it on remount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <DebtsCard
        customers={[customer()]}
        total="600.00"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Debts owed to the business/ }),
    );
    expect(window.localStorage.getItem(KEY)).toBe("1");
    unmount();

    render(
      <DebtsCard
        customers={[customer()]}
        total="600.00"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    // Restored collapsed state means the table doesn't reappear.
    expect(await screen.findByText("KES 600.00")).toBeInTheDocument();
    expect(screen.queryByText("Demo Customer A")).not.toBeInTheDocument();
  });
});
