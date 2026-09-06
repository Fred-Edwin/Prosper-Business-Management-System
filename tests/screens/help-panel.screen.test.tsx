// @vitest-environment jsdom
//
// Per-screen gate — the in-app help panel (components/help/*). The "?" button
// lives in the Admin shell header; opening it shows a kit <Drawer> rail with
// the current screen's help content, keyed off pathname + ?tab= via lib/help.
//
// Covered:
//   • a route WITH a topic → panel opens with that screen's title + steps
//   • ?tab= selects the per-tab section
//   • closing the panel (Esc)
//   • a route with NO topic → helpTopicForPath returns nothing, panel renders null

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { helpTopicForPath, resolveHelpSection } from "@/lib/help";
import { HelpProvider, useHelp } from "@/components/help/help-context";
import { HelpPanel } from "@/components/help/help-panel";

let pathname = "/admin/financials";
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: vi.fn() }),
}));

function Harness({ tab }: { tab: string | null }) {
  const help = useHelp();
  return (
    <>
      <button onClick={() => help?.openHelp()}>open help</button>
      <HelpPanel tab={tab} />
    </>
  );
}

function renderAt(path: string, tab: string | null = null) {
  pathname = path;
  return render(
    <HelpProvider>
      <Harness tab={tab} />
    </HelpProvider>,
  );
}

describe("lib/help resolution", () => {
  it("matches nested routes to their section", () => {
    expect(helpTopicForPath("/admin/customers/abc123")?.title).toBe(
      "Customers & Credit",
    );
  });

  it("resolves /admin exactly to the Dashboard topic", () => {
    expect(helpTopicForPath("/admin")?.title).toBe("Dashboard");
  });

  it("returns undefined for a route with no topic", () => {
    expect(helpTopicForPath("/admin/nothing-here")).toBeUndefined();
  });

  it("per-tab override replaces steps but can inherit whatItIs", () => {
    const topic = helpTopicForPath("/admin/sales")!;
    const derived = resolveHelpSection(topic, "derived");
    expect(derived.title).toBe("Canteen Derived");
    expect(derived.whatItIs).toMatch(/not entered one by one/i);
  });

  it("matches each staff base route to its home topic", () => {
    expect(helpTopicForPath("/cashier")?.title).toBe("Today");
    expect(helpTopicForPath("/store-manager")?.title).toBe("Store Hub");
    expect(helpTopicForPath("/canteen")?.title).toBe("Canteen Hub");
  });

  it("a staff base route does not out-rank a deeper flow topic", () => {
    expect(helpTopicForPath("/store-manager/flows/issue")?.title).toBe(
      "Issue Ingredients",
    );
    expect(helpTopicForPath("/canteen/stock-count")?.title).toBe("Stock Count");
  });

  it("resolves a dynamic [id] segment", () => {
    expect(helpTopicForPath("/cashier/orders/9f3a2")?.title).toBe("Order");
    // the plain /cashier/orders/new topic still wins its exact path
    expect(helpTopicForPath("/cashier/orders/new")?.title).toBe("New Order");
  });
});

describe("HelpPanel", () => {
  it("opens with the current screen's help and closes on Esc", async () => {
    const user = userEvent.setup();
    renderAt("/admin/financials");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByText("open help"));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Stock Purchases"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Record a purchase")).toBeInTheDocument();

    // The kit Drawer plays an exit transition and unmounts on transitionend,
    // which jsdom never fires — assert it entered the closing state instead.
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "closing"),
    );
  });

  it("shows the per-tab section when ?tab= is set", async () => {
    const user = userEvent.setup();
    renderAt("/admin/financials", "handovers");
    await user.click(screen.getByText("open help"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Handovers"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/read the variance/i)).toBeInTheDocument();
  });

  it("renders nothing for a route with no topic", async () => {
    const user = userEvent.setup();
    renderAt("/admin/nothing-here");
    await user.click(screen.getByText("open help"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
