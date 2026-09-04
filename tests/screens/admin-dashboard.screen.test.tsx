// @vitest-environment jsdom
//
// Per-screen gate — `/admin` dashboard (M5 S14). Composed from
// components/kit/* + the two documented inline bar strips, against
// GET /api/admin/dashboard (see docs/design/flows/dashboard-screen.md).
//
// Interactive / guarantee bits only (no specs for read-only display):
//   • the Needs-attention action links navigate to the right routes
//   • the all-clear empty state renders when every queue is clear
//   • the Day Close toggle still works from its new position (Band 5)
//   • RECONCILIATION: the Position figures the dashboard renders are the
//     API's `position.*` verbatim — no rounding / transform — so they
//     agree with the Financials balance figures at the same instant (the
//     data-layer guarantee proven in S13 survives the UI wiring).
//
// useDashboard + useDayClose are mocked; no server / DB. jsdom applies no
// CSS, so BOTH the `md:` and `md:hidden` branches render — queries use
// getAllBy / within where they'd otherwise be ambiguous.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { DashboardView } from "@/lib/domain/dashboard";
import type { DayCloseView, DayStatusView } from "@/lib/domain/audit";

// ── next/link → plain <a> ─────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── useDashboard mock ────────────────────────────────────────────────
let dashState: {
  data: DashboardView | null;
  loading: boolean;
  error: string | null;
};
const refreshDash = vi.fn();
vi.mock("@/app/admin/use-dashboard", () => ({
  useDashboard: () => ({ ...dashState, refresh: refreshDash }),
}));

// ── useDayClose mock (Band 5's card) ─────────────────────────────────
const closeDay = vi.fn().mockResolvedValue(undefined);
const reopenDay = vi.fn().mockResolvedValue(undefined);
let dayCloseState: {
  today: DayStatusView | null;
  recent: DayCloseView[];
  loading: boolean;
  error: string | null;
};
vi.mock("@/app/admin/day-close/use-day-close", () => ({
  useDayClose: () => ({
    ...dayCloseState,
    refresh: vi.fn(),
    close: closeDay,
    reopen: reopenDay,
  }),
}));

import { DashboardClient } from "@/app/admin/dashboard-client";

// ── fixtures ─────────────────────────────────────────────────────────

function view(over: Partial<DashboardView> = {}): DashboardView {
  return {
    date: "2026-09-03",
    position: {
      liquidity: "182400.00",
      cash: "54300.00",
      mpesaBank: "128100.00",
      ownerOwedToBusiness: "15000.00",
    },
    week: {
      from: "2026-08-31",
      to: "2026-09-06",
      dailyNet: [
        { date: "2026-08-31", net: "4200.00" },
        { date: "2026-09-01", net: "-1100.00" },
        { date: "2026-09-02", net: "3800.00" },
        { date: "2026-09-03", net: "900.00" },
        { date: "2026-09-04", net: null },
        { date: "2026-09-05", net: null },
        { date: "2026-09-06", net: null },
      ],
      revenueWtd: "48200.00",
      expensesWtd: "12300.00",
      netWtd: "7800.00",
      revenuePriorWtd: "39100.00",
      expensesPriorWtd: "9900.00",
      netPriorWtd: "5100.00",
    },
    needsAttention: {
      openPriorDates: ["2026-09-02"],
      handoversAwaitingReceipt: {
        count: 1,
        items: [
          {
            handoverId: "h1",
            locationName: "Canteen",
            staffName: "Mary Njeri",
            declaredTotal: "8400.00",
            occurredAt: "2026-09-03T15:00:00.000Z",
          },
        ],
      },
      openShortfalls: { count: 1, total: "1200.00" },
      lowOrNegativeStock: {
        count: 3,
        top: [
          { productName: "Cooking gas", locationName: "Restaurant", qty: "-2.0000", unit: "btl" },
          { productName: "Beef", locationName: "Restaurant", qty: "1.5000", unit: "kg" },
          { productName: "Cooking oil", locationName: "Store", qty: "3.0000", unit: "L" },
        ],
      },
    },
    today: {
      date: "2026-09-03",
      salesSoFar: "5000.00",
      stockMovementCount: 18,
      purchaseReceiptCount: 4,
      handoversReceived: 2,
      handoversDue: 1,
      correctionCountToday: 1,
    },
    trend: {
      dailyNet: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String(5 + i).padStart(2, "0")}`.slice(0, 10),
        net: i % 5 === 0 ? "-400.00" : "1500.00",
      })),
      net30Total: "41200.00",
    },
    // v2 — "Stock & activity by location" (backend shipped Session A; the
    // screen composition using this field is Session B's).
    stockActivity: [
      { locationId: "loc-store", locationName: "Store", movementCount: 6, lowStockCount: 1, handoverStatus: null },
      { locationId: "loc-restaurant", locationName: "Restaurant", movementCount: 14, lowStockCount: 2, handoverStatus: "awaiting" },
      { locationId: "loc-canteen", locationName: "Canteen", movementCount: 9, lowStockCount: 0, handoverStatus: "received" },
    ],
    ...over,
  };
}

const OPEN_TODAY: DayStatusView = {
  date: "2026-09-03",
  closed: false,
  closedBy: null,
  closedAt: null,
};

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <DashboardClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dashState = { data: view(), loading: false, error: null };
  dayCloseState = { today: OPEN_TODAY, recent: [], loading: false, error: null };
});

// ── Needs attention — links + all-clear ──────────────────────────────

describe("/admin dashboard — Needs attention", () => {
  it("each row's action link points at the right route", async () => {
    renderScreen();
    await screen.findAllByText(/needs attention/i);

    const hrefFor = (name: RegExp) =>
      screen.getAllByRole("link", { name }).map((a) => a.getAttribute("href"));

    expect(hrefFor(/Review day/)).toContain("/admin");
    expect(hrefFor(/Record receipt/)).toContain("/admin/financials?tab=handovers");
    expect(hrefFor(/Open handovers/)).toContain("/admin/financials?tab=handovers");
    expect(hrefFor(/Open stock/)).toContain("/admin/stock");
  });

  it("shows the open count and the danger dot copy for the low-stock row", async () => {
    renderScreen();
    // 4 queues populated (open days + awaiting + shortfall + low stock).
    expect((await screen.findAllByText("4 open")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/items low or negative on stock/i).length,
    ).toBeGreaterThan(0);
  });

  it("collapses to the all-clear state when every queue is empty", async () => {
    dashState = {
      data: view({
        needsAttention: {
          openPriorDates: [],
          handoversAwaitingReceipt: { count: 0, items: [] },
          openShortfalls: { count: 0, total: "0.00" },
          lowOrNegativeStock: { count: 0, top: [] },
        },
      }),
      loading: false,
      error: null,
    };
    renderScreen();

    expect(
      (await screen.findAllByText(/All clear — nothing needs you before you close\./i))
        .length,
    ).toBeGreaterThan(0);
    // No "N open" count when nothing is open.
    expect(screen.queryByText(/\d+ open/)).not.toBeInTheDocument();
    // No action links inside the band.
    expect(screen.queryByRole("link", { name: /Open stock/ })).not.toBeInTheDocument();
  });
});

// ── Day Close card — still interactive from Band 5 ───────────────────

describe("/admin dashboard — Day Close (Band 5)", () => {
  it("toggling today's switch calls close(date) and toasts", async () => {
    const user = userEvent.setup();
    renderScreen();

    const toggles = await screen.findAllByRole("switch", { name: /close today/i });
    await user.click(toggles[0]);

    await waitFor(() => expect(closeDay).toHaveBeenCalledWith("2026-09-03"));
    expect(await screen.findByText(/Sep 3, 2026 closed/)).toBeInTheDocument();
  });

  it("a recently-closed row's Reopen button calls reopen(date)", async () => {
    dayCloseState = {
      today: {
        date: "2026-09-03",
        closed: true,
        closedBy: "admin",
        closedAt: "2026-09-03T21:00:00.000Z",
      },
      recent: [
        { date: "2026-09-01", closedBy: "admin", closedAt: "2026-09-01T21:14:00.000Z" },
      ],
      loading: false,
      error: null,
    };
    const user = userEvent.setup();
    renderScreen();

    const reopenBtns = await screen.findAllByRole("button", { name: "Reopen" });
    await user.click(reopenBtns[0]);

    await waitFor(() => expect(reopenDay).toHaveBeenCalledWith("2026-09-01"));
  });
});

// ── Reconciliation — Position renders the API figures verbatim ───────

describe("/admin dashboard — Position figures reconcile with the API", () => {
  it("renders position.cash / mpesaBank / liquidity / ownerOwedToBusiness with no transform", async () => {
    // These four are the SAME derivations getFinancialSummary produces for
    // its balance figures (docs/API.md "Dashboard" · S13). The screen must
    // not round or re-derive them — it formats the decimal string as-is.
    dashState = {
      data: view({
        position: {
          liquidity: "182400.00",
          cash: "54300.00",
          mpesaBank: "128100.00",
          ownerOwedToBusiness: "15000.00",
        },
      }),
      loading: false,
      error: null,
    };
    renderScreen();
    await screen.findAllByText(/position right now/i);

    // Desktop columns + mobile stack both render → getAllByText.
    expect(screen.getAllByText("KES 182,400.00").length).toBeGreaterThan(0); // liquidity
    expect(screen.getAllByText("KES 54,300.00").length).toBeGreaterThan(0); // cash (desktop)
    expect(screen.getAllByText("54,300.00").length).toBeGreaterThan(0); // cash (mobile)
    expect(screen.getAllByText("KES 128,100.00").length).toBeGreaterThan(0); // mpesa/bank
    expect(screen.getAllByText("KES 15,000.00").length).toBeGreaterThan(0); // owed by owner
  });

  it("the liquidity figure equals cash + mpesaBank as formatted", async () => {
    dashState = {
      data: view({
        position: {
          cash: "1000.00",
          mpesaBank: "2500.50",
          liquidity: "3500.50",
          ownerOwedToBusiness: "0.00",
        },
      }),
      loading: false,
      error: null,
    };
    renderScreen();
    await screen.findAllByText(/position right now/i);
    expect(screen.getAllByText("KES 3,500.50").length).toBeGreaterThan(0);
  });
});

// ── Today's activity — the mobile reorder / readout ─────────────────

describe("/admin dashboard — Today's activity", () => {
  it("links Purchases & receipts to the Financials purchases tab", async () => {
    renderScreen();
    await screen.findAllByText(/today's activity/i);
    expect(
      screen
        .getAllByRole("link", { name: /Purchases & receipts/ })
        .map((a) => a.getAttribute("href")),
    ).toContain("/admin/financials?tab=purchases");
  });
});
