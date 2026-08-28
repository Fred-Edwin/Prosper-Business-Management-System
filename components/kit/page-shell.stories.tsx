import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PageShell } from "./page-shell";

/**
 * NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`, ADR-43 (DRAFT).
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ OWNER SIGN-OFF NEEDED (kit-audit "Remaining gaps" #1)                 ║
 * ║  · --content-max clamp = 1200px (the Paper admin Body frame)         ║
 * ║  · page padding = --sp-7 block / --sp-8 inline (catalog reference)   ║
 * ║  · sticky toolbar row: min-height --control-lg, --z-sticky,          ║
 * ║    hairline bottom border, its content also clamped to --content-max ║
 * ║  · `wide` escape hatch (full-bleed ledgers), `flush` (edge content)  ║
 * ║ Session 11 adopts this in the screen rebuild — confirm before then.  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
const meta = {
  title: "Kit/Primitives/PageShell — NEEDS OWNER REVIEW",
  component: PageShell,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const Filler = () => (
  <div
    style={{
      fontFamily: "var(--font-ui)",
      color: "var(--text-secondary)",
      border: "1px dashed var(--border-strong)",
      borderRadius: 6,
      padding: 16,
      minHeight: 320,
    }}
  >
    Page content region — clamped to --content-max, centred.
  </div>
);

const Toolbar = () => (
  <>
    <h1
      style={{
        font: "var(--weight-semibold) var(--text-h1)/var(--leading-h1) var(--font-ui)",
        color: "var(--text-primary)",
        margin: 0,
      }}
    >
      Product Catalog
    </h1>
    <span style={{ marginLeft: "auto" }} />
    <button
      className="kit-interactive kit-focus-ring bg-accent text-(--text-inverse) h-(--control-md) px-(--sp-6) rounded-sm [--kit-hover-bg:var(--color-accent-hover)]"
      type="button"
    >
      Add product
    </button>
  </>
);

export const WithToolbar: Story = {
  name: "With sticky toolbar (≥ md)",
  args: { toolbar: <Toolbar />, children: <Filler /> },
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole("heading", { level: 1 });
    await expect(heading).toBeInTheDocument();
    // toolbar row is sticky
    const bar = heading.closest("div.sticky");
    await expect(bar).not.toBeNull();
  },
};

export const NoToolbar: Story = {
  name: "Without toolbar",
  args: { children: <Filler /> },
};

export const Wide: Story = {
  name: "wide (full-bleed — no --content-max clamp)",
  args: { toolbar: <Toolbar />, children: <Filler />, wide: true },
};

export const Flush: Story = {
  name: "flush (no page padding)",
  args: { children: <Filler />, flush: true },
};

export const NarrowViewport: Story = {
  name: "< md viewport",
  args: { toolbar: <Toolbar />, children: <Filler /> },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
