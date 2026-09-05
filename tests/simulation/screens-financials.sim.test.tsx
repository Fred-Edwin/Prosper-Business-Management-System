// @vitest-environment jsdom
// ═══════════════════════════════════════════════════════════════════════
// END-TO-END: does the SCREEN show the number the ledger actually holds?
//
// The ordinary specs in tests/screens/* mock the per-feature hooks, so
// they prove a screen renders what it is handed — never that what it is
// handed is right. The simulation suites prove the server's arithmetic —
// never that it reaches the pixel intact. This file joins the two ends:
//
//   real DB → real route handler → real hook → real screen → assert TEXT
//
// Nothing is mocked except `globalThis.fetch` (routed to the real
// handlers) and the session. The figures asserted are the hand-computed
// ones from clean-scenario.ts, so a failure here is readable by a human.
// ═══════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import { ToastProvider } from "@/components/kit/toast";
import { actAs, loadCast, resetLedger, type Cast } from "./harness";
import { installLiveFetch } from "./live-fetch";
import { runCleanScenario, CLEAN_DAYS, EXPECTED } from "./clean-scenario";

const [D1, , D3] = CLEAN_DAYS;
let cast: Cast;
let restoreFetch: () => void;

// next/navigation is not available in a bare jsdom render.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/financials",
}));

/** Switch the range control to "This month" (both layouts render in jsdom). */
function clickMonth(container: HTMLElement): void {
  const btns = within(container).getAllByRole("radio", { name: /This month/i });
  act(() => {
    btns[0].click();
  });
}

describe("the Financials screen shows the ledger's own numbers", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await resetLedger();
    cast = await loadCast();
    await runCleanScenario(cast);

    // Look at the books as the Admin, standing on the last clean day.
    vi.setSystemTime(new Date(`${D3}T20:00:00+03:00`));
    actAs(cast.admin);
    restoreFetch = installLiveFetch();
  }, 300_000);

  afterAll(() => {
    restoreFetch?.();
    vi.useRealTimers();
  });

  async function renderFinancials(tab: any = "expenses") {
    const { FinancialsClient } = await import(
      "@/app/admin/financials/financials-client"
    );
    return render(
      <ToastProvider>
        <FinancialsClient initialTab={tab} />
      </ToastProvider>,
    );
  }

  it("the Expenses KPI tile shows the hand-computed total for the range", async () => {
    await renderFinancials("expenses");

    // Default range is "today" = D3, whose expenses are 1,000.
    const expectedToday = EXPECTED.perDay[D3].expenses; // "1000.00"
    const asShown = Number(expectedToday).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await waitFor(
      () => {
        const hits = screen.queryAllByText((_t, el) => {
          const text = el?.textContent?.trim() ?? "";
          return text === asShown || text === asShown.replace(/\.00$/, "");
        });
        expect(
          hits.length,
          `expected the day's expense total (${asShown}) on screen`,
        ).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
  });

  it("the Expenses tab lists the day's real expense rows", async () => {
    await renderFinancials("expenses");
    // D3's single expense is transport 1,000.
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Transport/i);
      },
      { timeout: 15_000 },
    );
    const body = document.body.textContent ?? "";
    // The row, its amount, its account and its date — all from the ledger.
    expect(body).toMatch(/Transport/i);
    expect(body).toContain("1,000.00");
    expect(body).toMatch(/Cash/);
    expect(body).toMatch(/Jun 3, 2026/);
    // And the tab's own count line agrees with the row it listed.
    expect(body).toMatch(/1 expense/);
  });

  it("switching the range to This month shows the 3-day totals, not the day's", async () => {
    const { container } = await renderFinancials("expenses");

    // Wait for the default (today) render to settle first.
    await waitFor(() => expect(document.body.textContent).toMatch(/Transport/i), {
      timeout: 15_000,
    });

    // June 2026 contains all three clean days, so "This month" must show
    // the full 8,000.00 of expenses — 5,000 + 2,000 + 1,000.
    // jsdom applies no CSS, so BOTH the mobile and desktop range controls
    // render (TEST_PLAN §2b). Either drives the same state — take the first.
    clickMonth(container);

    await waitFor(
      () => {
        expect(
          document.body.textContent,
          "This month must total the three days' expenses",
        ).toContain("8,000.00");
      },
      { timeout: 15_000 },
    );

    const body = document.body.textContent ?? "";
    // All three expense rows are now listed.
    expect(body).toMatch(/Rent/i);
    expect(body).toMatch(/Utilities/i);
    expect(body).toMatch(/Transport/i);
    expect(body).toMatch(/3 expenses/);
  });

  it("the Non-Sale tab shows the ADR-55 cost the server computed, not a re-derived one", async () => {
    const { container } = await renderFinancials("non-sale");

    clickMonth(container);

    // 2kg rice spoiled × 150/kg = 300.00 — the figure the SERVER reports.
    // The row cost is computed CLIENT-side (rowCost in non-sale-tab.tsx),
    // so this is the one place the two implementations must agree.
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Rice/i);
      },
      { timeout: 15_000 },
    );
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Spoiled/i);
    expect(body).toContain("300.00");
  });
});
