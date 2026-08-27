// Wired from docs/design/screens/product-drawer/page.tsx (Paper artboard 796-0).
// Markup/classes are verbatim from the skeleton; this file only adds the
// controlled form state, the Dish invariant on the kind control, per-location
// row state, and the Save → create/update → close + refresh orchestration.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import type {
  CreateProductInput,
  Location,
  ProductWithLocations,
} from "@/lib/domain/catalog";
import { CatalogRequestError } from "./use-catalog";

const KIND_OPTIONS = [
  { label: "Ingredient", value: "ingredient" as const },
  { label: "Dish", value: "dish" as const },
  { label: "Goods", value: "goods" as const },
];

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

  function pickKind(next: "ingredient" | "dish" | "goods") {
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

  if (!open) return null;

  return (
    <div className="flex flex-col w-[480px] h-fit rounded-md bg-(--surface-panel-tint) border border-solid [border-color:var(--border-subtle)] [font-synthesis:none] antialiased">
      {/* Header */}
      <div className="flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
          {isEdit ? "Edit Product" : "New Product"}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="kit-focus-ring">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) overflow-clip">
        {/* General Information */}
        <div className="flex flex-col gap-(--sp-6)">
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            General Information
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Product Name
            </div>
            <div
              className={`flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid ${
                fieldErrors.name ? "border-danger" : "[border-color:var(--border-strong)]"
              }`}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Breast"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
            {fieldErrors.name && (
              <div className="font-ui text-danger text-caption/micro">{fieldErrors.name}</div>
            )}
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Product kind
            </div>
            <div className="flex items-center h-[36px] p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]">
              {KIND_OPTIONS.map((opt) => {
                const isActive = opt.value === kind;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => pickKind(opt.value)}
                    className={`flex items-center justify-center h-[32px] px-(--sp-5) rounded-[2px] kit-focus-ring ${
                      isActive ? "[box-shadow:#00000014_0px_1px_2px] bg-(--surface-page)" : ""
                    }`}
                  >
                    <div
                      className={`font-ui text-sm/sm ${
                        isActive
                          ? "font-(--weight-medium) text-[oklch(28.4%_0.126_296.2)]"
                          : "font-(--weight-regular) [color:var(--text-secondary)]"
                      }`}
                    >
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Unit Label
            </div>
            <div
              className={`flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid ${
                fieldErrors.unitLabel ? "border-danger" : "[border-color:var(--border-strong)]"
              }`}
            >
              <input
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. kg, pcs, crate, packet"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
            {fieldErrors.unitLabel && (
              <div className="font-ui text-danger text-caption/micro">{fieldErrors.unitLabel}</div>
            )}
          </div>
        </div>

        {/* Cost & Buying Price */}
        <div className="flex flex-col pt-(--sp-6) gap-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            Cost &amp; Buying Price
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Buying Price
            </div>
            <div
              className={`flex items-center h-[36px] rounded-sm shrink-0 border border-solid ${
                fieldErrors.buyingPrice ? "border-danger" : "[border-color:var(--border-strong)]"
              } ${isDish ? "opacity-[0.5]" : ""}`}
            >
              <div className="flex items-center justify-center h-[36px] shrink-0 px-(--sp-5) [background-color:var(--surface-subtle)] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">KES</div>
              </div>
              <div className="font-mono pl-(--sp-5) grow">
                <input
                  value={isDish ? "0.00" : buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  disabled={isDish}
                  inputMode="decimal"
                  className="font-mono [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
            {fieldErrors.buyingPrice && (
              <div className="font-ui text-danger text-caption/micro">{fieldErrors.buyingPrice}</div>
            )}
          </div>
          {isDish && (
            <div className="flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-info-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 2 }}>
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
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            Location Availability &amp; Selling Prices
          </div>
          {fieldErrors.locations && (
            <div className="font-ui text-danger text-caption/micro">{fieldErrors.locations}</div>
          )}
          {rows.map((row) => (
            <div
              key={row.locationId}
              className="flex items-center p-(--sp-5) rounded-sm gap-(--sp-5) border border-solid [border-color:var(--border-subtle)]"
            >
              <button
                type="button"
                role="switch"
                aria-checked={row.enabled}
                aria-label={`Sell at ${row.label}`}
                onClick={() => setRowEnabled(row.locationId, !row.enabled)}
                className={`flex items-center w-[40px] h-[22px] shrink-0 p-[2px] rounded-[11px] kit-focus-ring ${
                  row.enabled ? "bg-accent" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-[50%] shrink-0 bg-white ${
                    row.enabled ? "ml-auto" : ""
                  }`}
                />
              </button>
              <div className="font-ui font-(--weight-medium) shrink-0 w-[90px] [color:var(--text-primary)] text-sm/micro">
                {row.label}
              </div>
              {row.enabled ? (
                <>
                  <div className="flex items-center h-[32px] w-[100px] shrink-0 rounded-sm border border-solid [border-color:var(--border-strong)]">
                    <div className="flex items-center justify-center h-[32px] shrink-0 px-[6px] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                      <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">KES</div>
                    </div>
                    <div className="font-mono pl-[6px] grow">
                      <input
                        value={row.price}
                        onChange={(e) => setRowPrice(row.locationId, e.target.value)}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="font-mono [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
                      />
                    </div>
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">Selling price</div>
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
          <div className="font-ui text-danger text-caption/micro">{formError}</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end shrink-0 p-(--sp-8) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
          Save Product
        </Button>
      </div>
    </div>
  );
}
