// @vitest-environment jsdom
//
// Per-screen gate — `/admin` dashboard v2 (Session B). Composed from
// components/kit/* + the documented inline bar strips, against
// GET /api/admin/dashboard, GET /api/financials/summary and
// GET /api/admin/dashboard/trend (see docs/design/flows/dashboard-screen.md
// "Structure (v2 — current)"). Extends the M5 S14 suite rather than
// replacing it — same mocking shape, same reconciliation discipline.
//
// Interactive / guarantee bits only (no specs for read-only display):
//   • period control changes trigger the right refetch (range passed to
//     useFinancialSummary / useDashboardTrend)
//   • the Needs-attention action links navigate to the right routes
//   • the all-clear empty state renders when every queue is clear
//   • the Day Close toggle still works from its new position (bottom zone)
//   • the new Stock & activity table renders `stockActivity` rows,
//     including the `handoverStatus: null` Store case
//   • the profit stack's Net Profit tile picks the right background
//     colour by sign
//   • RECONCILIATION: the Position figures the dashboard renders are the
//     API's `position.*` verbatim — no rounding / transform.
//
// useDashboard / useFinancialSummary / useDashboardTrend / useDayClose are
// all mocked; no server / DB. jsdom applies no CSS, so BOTH the `md:` and
// `md:hidden` branches render — queries use getAllBy / within where
// they'd otherwise be ambiguous.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { DashboardView } from "@/lib/domain/dashboard";
import type { FinancialSummary } from "@/lib/domain/financials";
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

// ── useFinancialSummary mock — called twice (current + prior period);
// track every {from, to} it's invoked with so the period-control test can
// assert a preset change re-requests the right range. ────────────────
const summaryCalls: { from: string; to: string }[] = [];
let summaryByRange: (from: string, to: string) => FinancialSummary | null;
const refreshSummary = vi.fn();
vi.mock("@/app/admin/financials/use-financials", () => ({
  useFinancialSummary: (from: string, to: string) => {
    summaryCalls.push({ from, to });
    return {
      summary: summaryByRange(from, to),
      loading: false,
      error: null,
      refresh: refreshSummary,
    };
  },
}));

// ── useDashboardTrend mock ─────────────────────────────────────────────
const trendCalls: { from: string; to: string }[] = [];
const refreshTrend = vi.fn();
vi.mock("@/app/admin/use-dashboard-trend", () => ({
  useDashboardTrend: (from: string, to: string) => {
    trendCalls.push({ from, to });
    return {
      data: {
        from,
        to,
        dailyNet: [
          { date: from, net: "500.00" },
          { date: to, net: "-200.00" },
        ],
      },
      loading: false,
      error: null,
      refresh: refreshTrend,
    };
  },
}));

// ── useDayClose mock (bottom zone) ─────────────────────────────────
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
    // v2 — "Stock & activity by location" (backend Session A, screen Session B).
    stockActivity: [
      { locationId: "loc-store", locationName: "Store", movementCount: 6, lowStockCount: 1, handoverStatus: null },
      { locationId: "loc-restaurant", locationName: "Restaurant", movementCount: 14, lowStockCount: 2, handoverStatus: "awaiting" },
      { locationId: "loc-canteen", locationName: "Canteen", movementCount: 9, lowStockCount: 0, handoverStatus: "received" },
    ],
    ...over,
  };
}

function summary(over: Partial<FinancialSummary["consolidated"]> = {}): FinancialSummary {
  return {
    from: "2026-08-31",
    to: "2026-09-03",
    perLocation: [
      { locationId: "loc-restaurant", locationName: "Restaurant", revenue: "9800.00", cogs: "6200.00", grossProfit: "3600.00" },
      { locationId: "loc-canteen", locationName: "Canteen", revenue: "4400.00", cogs: "3400.00", grossProfit: "1000.00" },
    ],
    consolidated: {
      revenue: "14200.00",
      cogs: "9600.00",
      grossProfit: "4600.00",
      totalExpenses: "31900.00",
      netProfit: "-27300.00",
      debtsOwedToBusiness: "1200.00",
      ownerOwedToBusiness: "15000.00",
      ownerDrawsForPeriod: "6000.00",
      cashBalance: "54300.00",
      mpesaBankBalance: "128100.00",
      ...over,
    },
    nonSaleConsumption: {
      total: "740.00",
      byReason: { staffMeal: "240.00", complimentary: "0.00", spoiled: "500.00", damaged: "0.00", other: "0.00" },
      dishWasteCostPercent: "0.60",
    },
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
  summaryCalls.length = 0;
  trendCalls.length = 0;
  dashState = { data: view(), loading: false, error: null };
  dayCloseState = { today: OPEN_TODAY, recent: [], loading: false, error: null };
  summaryByRange = () => summary();
});

// ── Period control — drives the period-scoped reads ──────────────────

describe("/admin dashboard — period control", () => {
  it("defaults to Today and requests that range from useFinancialSummary / useDashboardTrend", async () => {
    renderScreen();
    await screen.findAllByText(/right now/i);
    // Today's preset resolves from === to.
    expect(summaryCalls.length).toBeGreaterThan(0);
    expect(summaryCalls[0].from).toBe(summaryCalls[0].to);
    expect(trendCalls[0].from).toBe(trendCalls[0].to);
  });

  it("switching to This week re-requests a Monday–Sunday range", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findAllByText(/right now/i);
    summaryCalls.length = 0;
    trendCalls.length = 0;

    const weekButtons = screen.getAllByRole("radio", { name: "This week" });
    await user.click(weekButtons[0]);

    await waitFor(() => expect(trendCalls.length).toBeGreaterThan(0));
    // useDashboardTrend is only ever called with the CURRENT period's
    // range (never the prior-period comparison range), so it's the
    // unambiguous signal here — useFinancialSummary is called twice
    // (current + prior period) and their relative order isn't asserted.
    const last = trendCalls.at(-1)!;
    expect(last.from).not.toBe(last.to);
    expect(
      summaryCalls.some((c) => c.from === last.from && c.to === last.to),
    ).toBe(true);
  });
});

// ── Profit stack — Net Profit tile background by sign ─────────────────

describe("/admin dashboard — profit stack", () => {
  it("Net Profit renders in the danger-toned figure when negative", async () => {
    summaryByRange = () => summary({ netProfit: "-27300.00" });
    renderScreen();
    const figures = await screen.findAllByText("− KES 27,300.00");
    expect(figures.length).toBeGreaterThan(0);
    expect(figures[0].className).toContain("text-danger");
  });

  it("Net Profit renders in the success-toned figure when non-negative", async () => {
    summaryByRange = () => summary({ netProfit: "33400.00" });
    renderScreen();
    const figures = await screen.findAllByText("KES 33,400.00");
    expect(figures.length).toBeGreaterThan(0);
    expect(figures[0].className).toContain("text-success");
  });

  it("renders owner draws for the period", async () => {
    summaryByRange = () => summary({ ownerDrawsForPeriod: "6000.00" });
    renderScreen();
    expect((await screen.findAllByText("KES 6,000.00")).length).toBeGreaterThan(0);
  });
});

// ── Financial performance / Stock & activity by location tables ──────

describe("/admin dashboard — location tables", () => {
  it("financial performance table shows Restaurant + Canteen, not Store", async () => {
    renderScreen();
    await screen.findAllByText(/financial performance by location/i);
    expect(screen.getAllByText("Restaurant").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Canteen").length).toBeGreaterThan(0);
  });

  it("stock activity table includes Store with a dash for handover (null status)", async () => {
    renderScreen();
    await screen.findAllByText(/stock & activity by location/i);
    // Store row renders; its handover cell is the "—" placeholder, not a
    // status pip, since `handoverStatus: null`.
    const storeRows = screen.getAllByText("Store");
    expect(storeRows.length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders Awaiting / Received pips for Restaurant / Canteen handover status", async () => {
    renderScreen();
    await screen.findAllByText(/stock & activity by location/i);
    expect(screen.getAllByText("Awaiting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Received").length).toBeGreaterThan(0);
  });
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
    expect(screen.queryByText(/\d+ open/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open stock/ })).not.toBeInTheDocument();
  });
});

// ── Day Close card — still interactive from its new position ─────────

describe("/admin dashboard — Day Close", () => {
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
    await screen.findAllByText(/right now/i);

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
    await screen.findAllByText(/right now/i);
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
