// @vitest-environment jsdom
// END-TO-END: the Admin Dashboard — the screen the owner actually looks
// at for "how is the business doing". Same principle as
// screens-financials: real DB → real handler → real hook → real screen,
// asserting the TEXT rendered, against figures computed by hand in
// clean-scenario.ts.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import { ToastProvider } from "@/components/kit/toast";
import { actAs, loadCast, resetLedger, type Cast } from "./harness";
import { installLiveFetch } from "./live-fetch";
import { runCleanScenario, CLEAN_DAYS, EXPECTED } from "./clean-scenario";

const [D1, , D3] = CLEAN_DAYS;
let cast: Cast;
let restoreFetch: () => void;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
}));

function clickMonth(container: HTMLElement): void {
  const btns = within(container).getAllByRole("radio", { name: /This month/i });
  act(() => {
    btns[0].click();
  });
}

describe("the Admin Dashboard shows the ledger's own numbers", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await resetLedger();
    cast = await loadCast();
    await runCleanScenario(cast);
    vi.setSystemTime(new Date(`${D3}T20:00:00+03:00`));
    actAs(cast.admin);
    restoreFetch = installLiveFetch();
  }, 300_000);

  afterAll(() => {
    restoreFetch?.();
    vi.useRealTimers();
  });

  async function renderDashboard() {
    const { DashboardClient } = await import("@/app/admin/dashboard-client");
    return render(
      <ToastProvider>
        <DashboardClient />
      </ToastProvider>,
    );
  }

  it("renders the month's revenue and expenses as the hand-computed figures", async () => {
    const { container } = await renderDashboard();

    // Let the default (today) view settle, then take the whole period.
    await waitFor(() => expect(document.body.textContent?.length ?? 0).toBeGreaterThan(200), {
      timeout: 15_000,
    });
    clickMonth(container);

    await waitFor(
      () => {
        const body = document.body.textContent ?? "";
        // Revenue 5,400.00 and Expenses 8,000.00 over the three clean days.
        expect(body, "dashboard must show the period revenue").toContain("5,400.00");
      },
      { timeout: 15_000 },
    );

    const body = document.body.textContent ?? "";
    expect(body, "dashboard must show the period expenses").toContain("8,000.00");
  });

  it("the debts figure on screen matches the ledger (1,000 raised − 400 repaid)", async () => {
    const { container } = await renderDashboard();
    await waitFor(() => expect(document.body.textContent?.length ?? 0).toBeGreaterThan(200), {
      timeout: 15_000,
    });
    clickMonth(container);

    await waitFor(
      () => {
        expect(document.body.textContent).toContain("600.00");
      },
      { timeout: 15_000 },
    );
  });
});
