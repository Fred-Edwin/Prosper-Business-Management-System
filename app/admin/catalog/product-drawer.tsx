// Session 11 rebuild — COMPOSED from the proven kit, no longer a transcription
// of Paper artboard 796-0. The artboard is the visual acceptance target; the
// screen is assembled from <Drawer> + <FormField> + <SegmentedControl> +
// <ToggleSwitch> + <Button> + <Toast>. Every bit of form state, the Dish
// invariant, the per-location row state, and the Save -> create/update -> close
// orchestration is preserved verbatim from the previous version.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { useToast } from "@/components/kit/toast";
import type {
  CreateProductInput,
  Location,
  ProductWithLocations,
} from "@/lib/domain/catalog";
import { CatalogRequestError } from "./use-catalog";

const KIND_LABELS = ["Ingredient", "Dish", "Goods"] as const;
const KIND_BY_LABEL: Record<string, "ingredient" | "dish" | "goods"> = {
  Ingredient: "ingredient",
  Dish: "dish",
  Goods: "goods",
};
const LABEL_BY_KIND: Record<"ingredient" | "dish" | "goods", string> = {
  ingredient: "Ingredient",
  dish: "Dish",
  goods: "Goods",
};

// A4 (ADR-46 §8): a selection-driven hint under the Product-kind control.
// Replaces the old dish-only info banner — the `dish` line now carries the
// same fact in the same place as the other two.
const KIND_HINT: Record<"ingredient" | "dish" | "goods", string> = {
  ingredient:
    "A raw item you buy and cook with. Has a buying price; used up by production.",
  dish: "A finished item you sell from the menu. It has no buying price — its cost comes from the ingredients it uses.",
  goods:
    "An item you buy and resell as-is. Has a buying price and a selling price.",
};

type LocationRowState = {
  locationId: string;
  label: string;
  enabled: boolean;
  price: string;
};

export type ProductDrawerProps = {
  open: boolean;
  onClose: () => void;
  locations: Location[];
  /** `null` = create mode; a product = edit mode. */
  product: ProductWithLocations | null;
  onCreate: (input: CreateProductInput) => Promise<void>;
  onUpdate: (id: string, input: CreateProductInput) => Promise<void>;
  /** Opens the friction delete dialog for the product being edited (A2). */
  onRequestDelete?: () => void;
};

export function ProductDrawer({
  open,
  onClose,
  locations,
  product,
  onCreate,
  onUpdate,
  onRequestDelete,
}: ProductDrawerProps) {
  const isEdit = product !== null;
  // Archived-record guard (ADR-47 §3.2) — the Archived tab only offers
  // "Unarchive", so the Edit drawer should never open on an archived row.
  // If it does (deep link / stale state), render read-only: fields
  // disabled, an info line, and a Close-only footer.
  const isArchived = product?.deletedAt != null;
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<"ingredient" | "dish" | "goods">(
    "ingredient",
  );
  const [unitLabel, setUnitLabel] = React.useState("");
  // M2 6b: Admin-set menu category — free-text, optional. Powers the C2 / K1
  // category tab rows (`null` → an "Uncategorised" tab).
  const [category, setCategory] = React.useState("");
  const [buyingPrice, setBuyingPrice] = React.useState("0.00");
  const [rows, setRows] = React.useState<LocationRowState[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // (Re)seed the form whenever the drawer opens or its target changes.
  React.useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setFormError(null);

    if (product) {
      setName(product.name);
      setKind(product.kind);
      setUnitLabel(product.unitLabel);
      setCategory(product.category ?? "");
      setBuyingPrice(product.buyingPrice ?? "0.00");
      setRows(
        locations.map((loc) => {
          const existing = product.locations.find(
            (pl) => pl.locationId === loc.id,
          );
          return {
            locationId: loc.id,
            label: loc.name,
            enabled: existing ? existing.active : false,
            price: existing?.sellingPrice ?? "",
          };
        }),
      );
    } else {
      setName("");
      setKind("ingredient");
      setUnitLabel("");
      setCategory("");
      setBuyingPrice("0.00");
      setRows(
        locations.map((loc) => ({
          locationId: loc.id,
          label: loc.name,
          enabled: false,
          price: "",
        })),
      );
    }
  }, [open, product, locations]);

  const isDish = kind === "dish";

  function pickKind(nextLabel: string) {
    const next = KIND_BY_LABEL[nextLabel];
    setKind(next);
    if (next === "dish") setBuyingPrice("0.00");
  }

  function setRowEnabled(locationId: string, enabled: boolean) {
    setRows((prev) =>
      prev.map((r) => (r.locationId === locationId ? { ...r, enabled } : r)),
    );
  }
  function setRowPrice(locationId: string, price: string) {
    setRows((prev) =>
      prev.map((r) => (r.locationId === locationId ? { ...r, price } : r)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    const input: CreateProductInput = {
      name: name.trim(),
      kind,
      unitLabel: unitLabel.trim(),
      category: category.trim() === "" ? null : category.trim(),
      buyingPrice: isDish ? "0" : buyingPrice.trim(),
      locations: rows.map((r) => ({
        locationId: r.locationId,
        active: r.enabled,
        sellingPrice: r.enabled && r.price.trim() !== "" ? r.price.trim() : null,
      })),
    };

    try {
      if (isEdit && product) {
        await onUpdate(product.id, input);
      } else {
        await onCreate(input);
      }
      toast(isEdit ? "Product updated" : "Product created", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof CatalogRequestError && e.field) {
        setFieldErrors({ [e.field]: e.message });
      } else {
        setFormError(
          e instanceof Error ? e.message : "Could not save the product.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldBox =
    "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid kit-field";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="rail"
      title={isArchived ? "Product (archived)" : isEdit ? "Edit Product" : "New Product"}
      footer={
        isArchived ? (
          <Button variant="secondary" onClick={onClose} className="grow">
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              className="grow"
            >
              Save Product
            </Button>
          </>
        )
      }
    >
      {isArchived && (
        <div className="flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-info-bg">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
            <line x1="12" y1="16" x2="12" y2="12" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="font-ui text-info text-sm/sm">
            This record is archived. Unarchive it to make changes.
          </div>
        </div>
      )}

      <fieldset
        disabled={isArchived}
        className="contents disabled:[&_input]:opacity-[0.5] disabled:[&_input]:cursor-not-allowed"
      >
      {/* General Information */}
      <div className="flex flex-col gap-(--sp-6)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] [color:var(--text-tertiary)] text-caption/micro">
          General Information
        </div>

        <FormField
          label="Product Name"
          error={fieldErrors.name}
          className="w-full"
        >
          {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
            <div
              className={`${fieldBox} ${
                invalid ? "border-danger" : "[border-color:var(--border-strong)]"
              }`}
              data-invalid={invalid || undefined}
            >
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Breast"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>

        <div className="flex flex-col gap-[6px]">
          <SegmentedControl
            label="Product kind"
            options={[...KIND_LABELS]}
            value={LABEL_BY_KIND[kind]}
            onChange={pickKind}
          />
          <div className="flex mt-[6px] gap-[6px] font-ui text-caption/micro">
            <span className="shrink-0 [color:var(--text-tertiary)]">
              {LABEL_BY_KIND[kind]} —
            </span>
            <span className="[color:var(--text-secondary)]">{KIND_HINT[kind]}</span>
          </div>
        </div>

        <FormField
          label="Unit Label"
          error={fieldErrors.unitLabel}
          className="w-full"
        >
          {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
            <div
              className={`${fieldBox} ${
                invalid ? "border-danger" : "[border-color:var(--border-strong)]"
              }`}
              data-invalid={invalid || undefined}
            >
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. kg, pcs, crate, packet"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>

        {/* M2 6b: menu category — free-text, optional. Groups the C2 / K1
            product grids into category tabs ("" → the "Uncategorised" tab). */}
        <FormField
          label="Category"
          hint="Optional. Groups this item on the Cashier order grid (e.g. Mains, Drinks)."
          error={fieldErrors.category}
          className="w-full"
        >
          {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
            <div
              className={`${fieldBox} ${
                invalid ? "border-danger" : "[border-color:var(--border-strong)]"
              }`}
              data-invalid={invalid || undefined}
            >
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Mains, Drinks, Sides"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>
      </div>

      {/* Cost & Buying Price */}
      <div className="flex flex-col pt-(--sp-6) gap-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] [color:var(--text-tertiary)] text-caption/micro">
          Cost &amp; Buying Price
        </div>
        <FormField
          label="Buying Price"
          error={fieldErrors.buyingPrice}
          className="w-full"
        >
          {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
            <div
              className={`flex items-center h-(--control-md) rounded-sm shrink-0 border border-solid kit-field ${
                invalid ? "border-danger" : "[border-color:var(--border-strong)]"
              } ${isDish ? "opacity-[0.5]" : ""}`}
              data-invalid={invalid || undefined}
            >
              <div className="flex items-center justify-center h-(--control-md) shrink-0 px-(--sp-5) [background-color:var(--surface-subtle)] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                  KES
                </div>
              </div>
              <div className="font-mono pl-(--sp-5) grow">
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={isDish ? "0.00" : buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  disabled={isDish}
                  inputMode="decimal"
                  className="font-mono [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </FormField>
      </div>

      {/* Location Availability & Selling Prices */}
      <div className="flex flex-col pt-(--sp-6) gap-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] [color:var(--text-tertiary)] text-caption/micro">
          Location Availability &amp; Selling Prices
        </div>
        {fieldErrors.locations && (
          <div className="font-ui text-danger text-caption/micro">
            {fieldErrors.locations}
          </div>
        )}
        {rows.map((row) => (
          <div
            key={row.locationId}
            className="flex items-center p-(--sp-5) rounded-sm gap-(--sp-5) border border-solid [border-color:var(--border-subtle)]"
          >
            <ToggleSwitch
              checked={row.enabled}
              onChange={(next) => setRowEnabled(row.locationId, next)}
              aria-label={`Sell at ${row.label}`}
            />
            <div className="font-ui font-(--weight-medium) shrink-0 w-[90px] [color:var(--text-primary)] text-sm/micro">
              {row.label}
            </div>
            {row.enabled ? (
              <>
                <div className="flex items-center h-(--control-sm) w-[100px] shrink-0 rounded-sm border border-solid [border-color:var(--border-strong)] kit-field">
                  <div className="flex items-center justify-center h-(--control-sm) shrink-0 px-[6px] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                    <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                      KES
                    </div>
                  </div>
                  <div className="font-mono pl-[6px] grow">
                    <input
                      value={row.price}
                      onChange={(e) => setRowPrice(row.locationId, e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label={`Selling price at ${row.label}`}
                      className="font-mono [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
                    />
                  </div>
                </div>
                <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                  Selling price
                </div>
              </>
            ) : (
              <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">
                Storage only — no selling price
              </div>
            )}
          </div>
        ))}
      </div>
      </fieldset>

      {formError && (
        <div role="alert" className="font-ui text-danger text-caption/micro">
          {formError}
        </div>
      )}

      {/* Delete section (A2 / ADR-46 §5) — edit mode only, not on an archived
          record. Opens the unchanged <ProductDeleteDialog>; the friction
          retype-gate is untouched. */}
      {isEdit && !isArchived && onRequestDelete && (
        <div className="flex flex-col mt-[4px] pt-[20px] gap-[8px] border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/micro">
            Delete this product
          </div>
          <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
            Removes it from the catalog. Blocked if it has transaction history —
            archive it instead.
          </div>
          <button
            type="button"
            onClick={onRequestDelete}
            className="kit-interactive kit-focus-ring inline-flex self-start items-center h-[32px] mt-[2px] px-[4px] gap-[6px] shrink-0 rounded-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <path
                d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12"
                fill="none"
                stroke="var(--color-danger)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-ui font-(--weight-medium) text-danger text-sm/sm">
              Delete this product…
            </span>
          </button>
        </div>
      )}
    </Drawer>
  );
}
