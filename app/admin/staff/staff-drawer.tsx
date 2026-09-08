"use client";

// M4 S9B — the add / edit staff drawer for /admin/staff.
// Composed from the frozen kit: <Drawer> + <FormField> + <Select> +
// <TextInput> + <ToggleSwitch> + <Button> + <Toast>, following
// app/admin/financials/expense-drawer.tsx and app/admin/catalog/product-drawer.tsx.
//
//   mode "create" → name / role / location / dailyRate / PIN / active;
//                   POSTs /api/staff (createStaff — also creates the login
//                   User with the bcrypt-hashed PIN).
//   mode "edit"   → same fields; PIN is OPTIONAL (blank = leave unchanged);
//                   PATCH /api/staff/:id. The Active toggle turning OFF
//                   calls PATCH ?mode=deactivate (soft — also disables the
//                   login). There is no reactivate path in S8A, so the
//                   toggle is disabled once off (documented below).
//
// The Admin sets a STAFF member's PIN here (no current PIN required).
// Self-service PIN change for the signed-in Admin's own account is a
// separate flow — see ./change-pin-drawer.tsx + API.md. (The API also
// allows staff to call it, but there is no staff-side UI entry point
// yet — see the M4/M5 follow-up note in PROGRESS.md.)

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { TextInput } from "@/components/kit/text-input";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { useToast } from "@/components/kit/toast";
import type { StaffView } from "@/lib/domain/staff";
import type { CreateStaffBody, UpdateStaffBody } from "@/lib/validation/staff";
import { ROLE_LABEL } from "./format";
import type { LocationOption } from "./use-staff";
import { StaffRequestError } from "./use-staff";

type CreateWithAccess = Extract<CreateStaffBody, { appAccess: true }>;

const ROLE_OPTIONS = (
  ["store_manager", "cashier", "canteen_attendant"] as const
).map((r) => ({ value: r, label: ROLE_LABEL[r] }));

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  CONFLICT: "That login name is already taken — choose a different full name.",
  FORBIDDEN: "Only an administrator can manage staff.",
  NOT_FOUND: "That staff member no longer exists.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const validRate = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());
const validPin = (v: string) => /^\d{4}$/.test(v.trim());

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

export function StaffDrawer({
  mode,
  target,
  locations,
  onCreate,
  onUpdate,
  onDeactivate,
  onClose,
}: {
  mode: "create" | "edit";
  /** The staff member being edited (mode "edit" only). */
  target?: StaffView;
  locations: LocationOption[];
  onCreate: (body: CreateStaffBody) => Promise<unknown>;
  onUpdate: (id: string, body: UpdateStaffBody) => Promise<unknown>;
  onDeactivate: (id: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = mode === "edit";

  // App access decides the shape: ON → role + PIN + a login `User`;
  // OFF → a job title only, no login (a cook / casual). Fixed at creation
  // — the edit drawer shows it read-only (granting/revoking access is a
  // deactivate-and-re-add, mirroring how the Active toggle only goes off).
  const [appAccess, setAppAccess] = React.useState<boolean>(
    target ? target.appAccess : true,
  );
  const [name, setName] = React.useState(target?.name ?? "");
  const [role, setRole] = React.useState<string>(target?.role ?? "");
  const [jobTitle, setJobTitle] = React.useState<string>(
    target?.jobTitle ?? "",
  );
  const [locationId, setLocationId] = React.useState<string>(
    target?.locationId ?? "",
  );
  const [dailyRate, setDailyRate] = React.useState<string>(
    target ? target.dailyRate : "",
  );
  const [pin, setPin] = React.useState("");
  const [active, setActive] = React.useState<boolean>(target?.active ?? true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const locationOptions = React.useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );

  // Was-active-now-off in the edit drawer = a deactivation (a separate API
  // mode). Once a staff member is inactive there is no reactivate endpoint
  // in S8A, so the toggle can only be turned OFF, never back on here.
  const wasActive = target?.active ?? true;

  const canSubmit =
    name.trim().length > 0 &&
    locationId !== "" &&
    validRate(dailyRate) &&
    (appAccess
      ? role !== "" &&
        (isEdit ? pin === "" || validPin(pin) : validPin(pin))
      : jobTitle.trim().length > 0) &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      if (isEdit && target) {
        // A deactivation is its own call and must go first (it also
        // disables the login).
        if (wasActive && !active) {
          await onDeactivate(target.id);
          toast("Staff member deactivated", { tone: "success" });
          onClose();
          return;
        }
        const body: UpdateStaffBody = {
          name: name.trim(),
          locationId,
          dailyRate: dailyRate.trim(),
          ...(target.appAccess
            ? {
                role: role as CreateWithAccess["role"],
                ...(pin.trim() ? { pin: pin.trim() } : {}),
              }
            : { jobTitle: jobTitle.trim() }),
        };
        await onUpdate(target.id, body);
        toast("Staff member updated", { tone: "success" });
      } else if (appAccess) {
        await onCreate({
          appAccess: true,
          name: name.trim(),
          role: role as CreateWithAccess["role"],
          locationId,
          dailyRate: dailyRate.trim(),
          pin: pin.trim(),
        });
        toast("Staff member added", { tone: "success" });
      } else {
        await onCreate({
          appAccess: false,
          name: name.trim(),
          jobTitle: jobTitle.trim(),
          locationId,
          dailyRate: dailyRate.trim(),
        });
        toast("Staff member added", { tone: "success" });
      }
      onClose();
    } catch (e) {
      if (e instanceof StaffRequestError) {
        if (e.field) setFieldErrors({ [e.field]: e.message });
        setError(CODE_MESSAGE[e.code] ?? e.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? "Edit staff member" : "Add staff"}
      subtitle={
        isEdit
          ? (target?.name ?? "")
          : appAccess
            ? "New team member with a login"
            : "New team member — roster only, no login"
      }
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            {isEdit ? "Save changes" : "Add staff"}
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <FormField label="Full name" required error={fieldErrors.name}>
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grace Wanjiru"
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      {/* App access — decides the shape of the rest of the form. Fixed at
          creation; shown read-only when editing. */}
      <div className="flex items-start gap-(--sp-5) pt-(--sp-2)">
        <ToggleSwitch
          checked={appAccess}
          disabled={isEdit}
          onChange={setAppAccess}
          aria-label="Can log into the app"
        />
        <div className="flex flex-col gap-(--sp-1)">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            Can log into the app
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {isEdit
              ? appAccess
                ? "This staff member has an app login. Access can't be changed here."
                : "Roster-only — attendance and pay are tracked, but no app login. This can't be changed here."
              : appAccess
                ? "They'll get a login PIN and an app role."
                : "For cooks and casuals — tracked for attendance and pay, no login. Give them a job title instead of a role."}
          </span>
        </div>
      </div>

      {appAccess ? (
        <Select
          label="Role"
          required
          className="w-full"
          placeholder="Select a role…"
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
        />
      ) : (
        <FormField label="Job title" required error={fieldErrors.jobTitle}>
          {({
            id,
            "aria-describedby": describedBy,
            "aria-invalid": invalid,
          }) => (
            <div className={fieldBox}>
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Cook"
                className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>
      )}

      <Select
        label="Location"
        required
        className="w-full"
        placeholder="Select a location…"
        value={locationId}
        onChange={setLocationId}
        options={locationOptions}
      />

      <FormField
        label="Daily rate"
        required
        hint="Used to compute gross pay as rate × days present."
        error={fieldErrors.dailyRate}
      >
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <div className={fieldBox}>
            <span className="font-mono shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              KES
            </span>
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      {appAccess && (
        <FormField
          label={isEdit ? "Reset login PIN" : "4-digit login PIN"}
          required={!isEdit}
          hint={
            isEdit
              ? "Leave blank to keep the current PIN."
              : "The Admin sets the initial PIN."
          }
          error={fieldErrors.pin}
        >
          {({
            id,
            "aria-describedby": describedBy,
            "aria-invalid": invalid,
          }) => (
            <div className={fieldBox}>
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder={isEdit ? "••••" : "1234"}
                className="font-mono [color:var(--text-primary)] text-body/body w-full bg-transparent outline-none [letter-spacing:0.4em] placeholder:[color:var(--text-tertiary)] placeholder:[letter-spacing:0.4em]"
              />
            </div>
          )}
        </FormField>
      )}

      <div className="flex items-start gap-(--sp-5) pt-(--sp-2)">
        <ToggleSwitch
          checked={active}
          disabled={!isEdit || !wasActive}
          onChange={setActive}
          aria-label="Active"
        />
        <div className="flex flex-col gap-(--sp-1)">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            Active
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {isEdit
              ? wasActive
                ? "Turning this off hides the staff member from attendance and pay and disables their login. This can't be undone here."
                : "This staff member is inactive — hidden from attendance and pay, login disabled."
              : "Inactive staff are hidden from attendance and pay."}
          </span>
        </div>
      </div>
    </Drawer>
  );
}
