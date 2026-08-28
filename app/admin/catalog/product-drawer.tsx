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

const DISH_NOTE =
  "Dishes carry zero buying price; true food cost is derived from ingredients.";

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
};

export function ProductDrawer({
  open,
  onClose,
  locations,
  product,
  onCreate,
  onUpdate,
}: ProductDrawerProps) {
  const isEdit = product !== null;
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<"ingredient" | "dish" | "goods">(
    "ingredient",
  );
  const [unitLabel, setUnitLabel] = React.useState("");
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
      title={isEdit ? "Edit Product" : "New Product"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            Save Product
          </Button>
        </>
      }
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

        <SegmentedControl
          label="Product kind"
          options={[...KIND_LABELS]}
          value={LABEL_BY_KIND[kind]}
          onChange={pickKind}
        />

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
        {isDish && (
          <div className="flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-info-bg">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
              <line x1="12" y1="16" x2="12" y2="12" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="font-ui text-info text-sm/sm">{DISH_NOTE}</div>
          </div>
        )}
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

      {formError && (
        <div role="alert" className="font-ui text-danger text-caption/micro">
          {formError}
        </div>
      )}
    </Drawer>
  );
}
