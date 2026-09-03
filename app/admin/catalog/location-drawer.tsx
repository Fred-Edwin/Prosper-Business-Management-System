// The add / edit Location drawer for /admin/catalog's Locations tab
// (Session 9C). Composed from the frozen kit — <Drawer> + <FormField> +
// <SegmentedControl> + <Button> + <Toast> — following
// app/admin/catalog/product-drawer.tsx and app/admin/staff/staff-drawer.tsx.
//
//   create → name + type;                POST /api/locations
//   edit   → name + type (in place — a Location is a catalog entry, not a
//            ledger; CONVENTIONS.md §4);  PATCH /api/locations/:id
//
// Deactivation is NOT here — it is a row action in the tab, because the
// domain's referential guard can 409 and that specific reason must be
// surfaced where the user triggered it.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { useToast } from "@/components/kit/toast";
import type {
  CreateLocationInput,
  Location,
  UpdateLocationInput,
} from "@/lib/domain/catalog";
import { CatalogRequestError } from "./use-catalog";

type LocationType = "restaurant" | "canteen" | "store";

const TYPE_LABELS = ["Restaurant", "Canteen", "Store"] as const;
const TYPE_BY_LABEL: Record<string, LocationType> = {
  Restaurant: "restaurant",
  Canteen: "canteen",
  Store: "store",
};
const LABEL_BY_TYPE: Record<LocationType, string> = {
  restaurant: "Restaurant",
  canteen: "Canteen",
  store: "Store",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

export function LocationDrawer({
  open,
  onClose,
  location,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  /** `null` = create mode; a location = edit mode. */
  location: Location | null;
  onCreate: (input: CreateLocationInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateLocationInput) => Promise<void>;
}) {
  const isEdit = location !== null;
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<LocationType>("restaurant");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setFormError(null);
    if (location) {
      setName(location.name);
      setType(location.type as LocationType);
    } else {
      setName("");
      setType("restaurant");
    }
  }, [open, location]);

  const canSubmit = name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (isEdit && location) {
        await onUpdate(location.id, { name: name.trim(), type });
      } else {
        await onCreate({ name: name.trim(), type });
      }
      toast(isEdit ? "Location updated" : "Location created", {
        tone: "success",
      });
      onClose();
    } catch (e) {
      if (e instanceof CatalogRequestError && e.field) {
        setFieldErrors({ [e.field]: e.message });
      } else {
        setFormError(
          e instanceof Error ? e.message : "Could not save the location.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="rail"
      title={isEdit ? "Edit Location" : "New Location"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!canSubmit}
            className="grow"
          >
            {isEdit ? "Save changes" : "Create Location"}
          </Button>
        </>
      }
    >
      {formError && (
        <div role="alert" className="font-ui text-danger text-caption/micro">
          {formError}
        </div>
      )}

      <FormField label="Location Name" required error={fieldErrors.name} className="w-full">
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <div className={fieldBox} data-invalid={invalid || undefined}>
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Canteen"
              className="font-ui [color:var(--text-primary)] text-sm/micro w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <SegmentedControl
        label="Type"
        options={[...TYPE_LABELS]}
        value={LABEL_BY_TYPE[type]}
        onChange={(nextLabel) => setType(TYPE_BY_LABEL[nextLabel])}
      />
      {fieldErrors.type && (
        <div className="font-ui text-danger text-caption/micro">
          {fieldErrors.type}
        </div>
      )}
    </Drawer>
  );
}
