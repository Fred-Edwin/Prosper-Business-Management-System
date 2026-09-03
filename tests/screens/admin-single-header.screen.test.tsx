// @vitest-environment jsdom
// ADR-56 — one header row per admin screen. The shell used to render a
// hardcoded "Prosper" toolbar row above every page's own <PageShell toolbar>.
// Now the page publishes its title + actions through <AdminToolbarProvider>
// and the shell renders them in its single header row next to the avatar.
//
// This is the one representative assertion of the collapsed structure; the
// per-screen specs still cover each screen's own title/actions text.
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AdminShell } from "@/components/shells/admin-shell";
import {
  AdminToolbarProvider,
  AdminPageHeader,
} from "@/components/shells/admin-toolbar-context";
import { PageShell } from "@/components/kit/page-shell";
import { Button } from "@/components/kit/button";

function FakePage() {
  return (
    <PageShell>
      <AdminPageHeader
        title="Financials & Expenses"
        actions={<Button variant="primary">Record Payment</Button>}
      />
      <p>page body</p>
    </PageShell>
  );
}

function renderShell() {
  return render(
    <AdminToolbarProvider>
      <AdminShell
        activeNavKey="financials"
        onNavigate={() => {}}
        accountName="Admin"
        accountRole="Admin"
        accountInitials="AK"
        onAccountClick={() => {}}
        collapsed={false}
        onToggleCollapsed={() => {}}
      >
        <FakePage />
      </AdminShell>
    </AdminToolbarProvider>,
  );
}

describe("admin shell — single header row (ADR-56)", () => {
  it("renders the page's title and actions in the shell header, with the account avatar", () => {
    renderShell();

    // The page title is present exactly once, as a heading is not required —
    // the shell renders a string title as a div — so assert on the text.
    expect(screen.getByText("Financials & Expenses")).toBeInTheDocument();

    // The page's primary action rendered up in the shell header.
    expect(
      screen.getByRole("button", { name: "Record Payment" }),
    ).toBeInTheDocument();

    // The account avatar button is still there and clickable.
    expect(
      screen.getAllByRole("button", { name: "Account" }).length,
    ).toBeGreaterThan(0);
  });

  it("has exactly one header row, and 'Prosper' is not in it", () => {
    const { container } = renderShell();

    // The shell's single header row is the 44px bordered flex row that holds
    // the title. It is the only header-shaped row on the page now.
    const title = screen.getByText("Financials & Expenses");
    const headerRow = title.closest(".border-b") as HTMLElement;
    expect(headerRow).not.toBeNull();
    expect(headerRow.className).toContain("h-[44px]");

    // The brand name lives only in the sidebar nav — never in the header row.
    expect(within(headerRow).queryByText("Prosper")).toBeNull();
    // (it IS still somewhere on the page — the sidebar)
    expect(screen.getByText("Prosper")).toBeInTheDocument();

    // <PageShell toolbar> would emit a second `sticky top-0` bar. The page
    // now uses <PageShell> without `toolbar`, so there is none.
    expect(container.querySelector(".sticky.top-0")).toBeNull();
  });
});
