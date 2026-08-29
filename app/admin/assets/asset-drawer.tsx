// Session 13 — Asset create/edit, COMPOSED from the kit rail <Drawer> +
// <FormField> + <Select> + <DatePicker> + <Button> + <Toast>.
//
// ADR-44 applies to the artboard (8JO-0 — pre-kit: --surface-panel-tint
// panel, a bespoke segmented "condition" control, a "+ Add Category"
// affordance for a field the schema has no column for). The proven kit is
// the visual target; the per-screen visual gate diffs against the kit
// Drawer / FormField / Select / DatePicker Storybook stories. See ADR-45.
//
// Design/UX note (carried from Session 12): the submit button stays enabled
// while the form is incomplete — the domain + Zod own validation and surface
// per-field errors on submit; there is no approved "disable until valid"
// artboard state.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { DatePicker } from "@/components/kit/date-picker";
import { useToast } from "@/components/kit/toast";
import type {
  AssetCondition,
  AssetView,
  CreateAssetInput,
  Location,
} from "@/lib/domain/assets/types";
// Value from the leaf module, not the domain barrel (barrel = server-only
// prisma code); `import type` above is erased so it's fine from either.
import { ASSET_CONDITIONS } from "@/lib/domain/assets/types";
import { AssetRequestError } from "./use-assets";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
/** Date -> "2025-01-15" (UTC calendar date, matches the API's YYYY-MM-DD). */
function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
/** "2025-01-15" -> Date at local midnight. */
function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
/** Date -> "Jan 15, 2025" for the trigger. */
function displayDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export type AssetDrawerProps = {
  open: boolean;
  onClose: () => void;
  locations: Location[];
  /** `null` = create mode; an asset = edit mode. */
  asset: AssetView | null;
  onCreate: (input: CreateAssetInput) => Promise<void>;
  onUpdate: (id: string, input: CreateAssetInput) => Promise<void>;
  /** Opens the friction delete dialog for the asset being edited (A2). */
  onRequestDelete?: () => void;
};

export function AssetDrawer({
  open,
  onClose,
  locations,
  asset,
  onCreate,
  onUpdate,
  onRequestDelete,
}: AssetDrawerProps) {
  const isEdit = asset !== null;
  // Archived-record guard (ADR-47 §3.2) — the Archived tab only offers
  // "Unarchive"; if the Edit drawer opens on an archived row anyway
  // (deep link / stale state) it renders read-only.
  const isArchived = asset?.deletedAt != null;
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState<Date>(new Date());
  const [purchaseCost, setPurchaseCost] = React.useState("");
  const [condition, setCondition] = React.useState<AssetCondition>("Good");
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

    if (asset) {
      setName(asset.name);
      setLocationId(asset.locationId);
      setPurchaseDate(fromIso(asset.purchaseDate));
      setPurchaseCost(asset.purchaseCost);
      setCondition(asset.condition);
    } else {
      setName("");
      setLocationId(locations[0]?.id ?? "");
      setPurchaseDate(new Date());
      setPurchaseCost("");
      setCondition("Good");
    }
  }, [open, asset, locations]);

  async function handleSave() {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    const input: CreateAssetInput = {
      name: name.trim(),
      locationId,
      purchaseDate: toIso(purchaseDate),
      purchaseCost: purchaseCost.trim(),
      condition,
    };

    try {
      if (isEdit && asset) {
        await onUpdate(asset.id, input);
      } else {
        await onCreate(input);
      }
      toast(isEdit ? "Asset updated" : "Asset registered", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof AssetRequestError && e.field) {
        setFieldErrors({ [e.field]: e.message });
      } else {
        setFormError(
          e instanceof Error ? e.message : "Could not save the asset.",
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
      title={
        isArchived ? "Asset (archived)" : isEdit ? "Edit Asset" : "Register New Asset"
      }
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
              Save Asset
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
      <div className="flex flex-col gap-(--sp-6)">
        <FormField label="Asset Name" error={fieldErrors.name} className="w-full">
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
                placeholder="e.g. Commercial Deep Fryer Double"
                className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>

        <Select
          label="Location"
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          value={locationId}
          onChange={setLocationId}
          placeholder="Select a location…"
          error={Boolean(fieldErrors.locationId)}
          helperText={fieldErrors.locationId}
          className="w-full"
        />

        <Select
          label="Condition"
          options={ASSET_CONDITIONS.map((c) => ({ value: c, label: c }))}
          value={condition}
          onChange={(v) => setCondition(v as AssetCondition)}
          error={Boolean(fieldErrors.condition)}
          helperText={fieldErrors.condition}
          className="w-full"
        />

        <div className="flex items-start gap-(--sp-5)">
          <DatePicker
            label="Purchase Date"
            value={displayDate(purchaseDate)}
            selected={purchaseDate}
            onSelect={setPurchaseDate}
            maxDate={new Date()}
          />
          <FormField
            label="Cost Basis (KES)"
            error={fieldErrors.purchaseCost}
            className="grow"
          >
            {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
              <div
                className={`${fieldBox} ${
                  invalid
                    ? "border-danger"
                    : "[border-color:var(--border-strong)]"
                }`}
                data-invalid={invalid || undefined}
              >
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="font-mono [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
                />
              </div>
            )}
          </FormField>
        </div>
      </div>

      </fieldset>

      {formError && (
        <div role="alert" className="font-ui text-danger text-caption/micro">
          {formError}
        </div>
      )}

      {/* Delete section (A2 / ADR-46 §5) — edit mode only, not on an archived
          record. Opens the unchanged <AssetDeleteDialog>. */}
      {isEdit && !isArchived && onRequestDelete && (
        <div className="flex flex-col mt-[4px] pt-[20px] gap-[8px] border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/micro">
            Delete this asset
          </div>
          <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
            Removes it from the register. Blocked if it has audit history.
          </div>
          <button
            type="button"
            onClick={onRequestDelete}
            className="kit-interactive kit-focus-ring inline-flex self-start items-center h-[32px] mt-[2px] px-[4px] gap-[6px] shrink-0 rounded-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
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
              Delete this asset…
            </span>
          </button>
        </div>
      )}
    </Drawer>
  );
}
