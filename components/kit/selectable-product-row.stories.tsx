import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SelectableProductRow } from "./selectable-product-row";

/**
 * SelectableProductRow (M2-3KIT) — the multi-row product picker row used by all
 * 6 Store-Manager / Canteen movement flows. Visual acceptance target: Paper
 * artboard `JL7-0` ("Component Kit — Selectable Product Row [M2-3D]").
 *
 * One story per drawn state:
 *   NotSelected · Selected · AtAvailable (+ disabled) · OverAvailableBlocked
 *   (§9.8, raises the blocked signal) · ZeroAvailable (row muted, + Select inert).
 * Plus TapToTypeQuantity (the ADR-48 inline-entry contract the stepper re-uses)
 * and DeselectBySteppingToZero.
 *
 * DEVIATION from JL7-0 / the handover (documented in the component header +
 * kit-audit §1): the embedded stepper is authored inline, not `<QuantityStepper>`
 * — the kit C10 can't render at the compact 108px / 32px / no-unit size the
 * artboard draws without breaking the fixed-width slot alignment. The ADR-43 /
 * ADR-48 `role="spinbutton"` + tap-to-type contract is re-used verbatim.
 */
const meta: Meta<typeof SelectableProductRow> = {
  title: "Kit/SelectableProductRow",
  component: SelectableProductRow,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SelectableProductRow>;

/** Controlled selected / quantity, mirroring the quantity-stepper.stories Harness. */
function Harness(
  p: Partial<React.ComponentProps<typeof SelectableProductRow>> & {
    onBlockedChange?: (id: string, blocked: boolean) => void;
  },
) {
  const [selected, setSelected] = React.useState(p.selected ?? false);
  const [quantity, setQuantity] = React.useState(p.quantity ?? 0);
  return (
    <SelectableProductRow
      productId="p-beef"
      name="Beef Fillet"
      unit="kg"
      available={46.5}
      step={1}
      {...p}
      selected={selected}
      quantity={quantity}
      onSelect={(id) => {
        setSelected(true);
        setQuantity(p.step ?? 1);
        p.onSelect?.(id);
      }}
      onDeselect={(id) => {
        setSelected(false);
        setQuantity(0);
        p.onDeselect?.(id);
      }}
      onQuantityChange={(id, n) => {
        setQuantity(n);
        p.onQuantityChange?.(id, n);
      }}
    />
  );
}

export const NotSelected: Story = {
  name: "1 · Not selected — ARTBOARD JL7-0",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("button", { name: "+ Select" }),
    ).toBeEnabled();
    await expect(c.getByText("Avail: 46.5 kg")).toBeInTheDocument();
    await expect(c.queryByRole("spinbutton")).not.toBeInTheDocument();
  },
};

export const Selected: Story = {
  name: "2 · Selected (in the batch) ⇒ §9.4 accent border + tint",
  render: () => <Harness selected quantity={24} />,
  parameters: {
    interaction: {
      assertColor: [
        {
          selector: '[data-selected="true"]',
          prop: "borderColor",
          token: "--color-accent",
        },
        {
          selector: '[data-selected="true"]',
          prop: "backgroundColor",
          token: "--surface-selected",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const spin = within(canvasElement).getByRole("spinbutton");
    await expect(spin).toHaveAttribute("aria-valuenow", "24");
    await expect(spin).toHaveAttribute("aria-valuetext", "24 kg");
    await expect(spin).toHaveAttribute("aria-valuemax", "46.5");
  },
};

export const AtAvailable: Story = {
  name: "3 · At available ⇒ + disabled (not an error)",
  render: () => <Harness selected quantity={46.5} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Increase" })).toBeDisabled();
    await expect(c.getByRole("button", { name: "Decrease" })).toBeEnabled();
    // not the blocked treatment
    await expect(c.queryByText(/on hand — reduce/)).not.toBeInTheDocument();
    await expect(c.getByRole("spinbutton")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

export const OverAvailableBlocked: Story = {
  name: "4 · Over available — BLOCKED (§9.8) ⇒ danger + blocked signal raised",
  args: { onBlockedChange: fn() },
  render: (args) => <Harness {...args} selected quantity={53} />,
  parameters: {
    interaction: {
      assertColor: [
        {
          selector: '[data-blocked="true"]',
          prop: "borderColor",
          token: "--color-danger",
        },
        {
          selector: '[data-blocked="true"]',
          prop: "backgroundColor",
          token: "--color-danger-bg",
        },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(
      c.getByText("Only 46.5 kg on hand — reduce or remove this line."),
    ).toBeInTheDocument();
    await expect(c.getByRole("spinbutton")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // the parent-notifying blocked signal fired true
    await expect(args.onBlockedChange).toHaveBeenCalledWith("p-beef", true);
  },
};

export const ZeroAvailable: Story = {
  name: "5 · Zero available ⇒ row muted, + Select inert (onSelect must not fire)",
  args: { onSelect: fn() },
  render: (args) => <Harness {...args} available={0} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", { name: "+ Select" });
    await expect(btn).toBeDisabled();
    await expect(c.getByText("None on hand")).toBeInTheDocument();
    await userEvent.click(btn, { pointerEventsCheck: 0 });
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

/**
 * The tap-to-type inline-entry path (ADR-48 / `DKR-0`) that the stepper re-uses:
 * focus the value, type a magnitude in one go, blur to commit.
 */
export const TapToTypeQuantity: Story = {
  name: "Value focused — type a quantity (30), blur commits",
  args: { onQuantityChange: fn(), onQuantityString: fn() },
  render: (args) => <Harness {...args} selected quantity={5} />,
  play: async ({ canvasElement, args }) => {
    const spin = within(canvasElement).getByRole<HTMLInputElement>("spinbutton");
    await userEvent.click(spin);
    await userEvent.clear(spin);
    await userEvent.type(spin, "30");
    await expect(spin).toHaveValue("30");
    await expect(args.onQuantityString).toHaveBeenLastCalledWith("p-beef", "30");
    await userEvent.tab();
    await expect(args.onQuantityChange).toHaveBeenLastCalledWith("p-beef", 30);
  },
};

export const DeselectBySteppingToZero: Story = {
  name: "Stepper ↓ past the floor ⇒ deselect (row returns to + Select)",
  args: { onDeselect: fn() },
  render: (args) => <Harness {...args} selected quantity={1} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Decrease" }));
    await expect(args.onDeselect).toHaveBeenCalledWith("p-beef");
    await expect(c.getByRole("button", { name: "+ Select" })).toBeInTheDocument();
  },
};

export const FocusSelectButton: Story = {
  name: "+ Select focus-visible ⇒ §9.1 accent ring",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: "button",
      assertFocusRing: "button",
    },
  },
};

export const LongName: Story = {
  name: "Long product name ⇒ ellipsis (min-w-0 name cell)",
  render: () => (
    <Harness name="Grass-fed Beef Fillet, Centre-cut, Trimmed, Portioned" />
  ),
};
