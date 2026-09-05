"use client";

// Self-service "change my own PIN" drawer for /admin/staff (Roster tab).
// Composed from the frozen kit: <Drawer> + <FormField> + <Button> +
// <Toast>, following the PIN field styling in ./staff-drawer.tsx.
//
// Distinct from that drawer's PIN field, which is the Admin resetting a
// STAFF member's PIN (no current PIN required). This one changes the
// signed-in user's own PIN via PATCH /api/auth/pin and requires the
// current PIN.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { useToast } from "@/components/kit/toast";
import { StaffRequestError } from "./use-staff";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "Account not found.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const validPin = (v: string) => /^\d{4}$/.test(v.trim());

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

function PinInput({
  id,
  describedBy,
  invalid,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  describedBy?: string;
  invalid?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className={fieldBox}>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        className="font-mono [color:var(--text-primary)] text-body/body w-full bg-transparent outline-none [letter-spacing:0.4em] placeholder:[color:var(--text-tertiary)] placeholder:[letter-spacing:0.4em]"
      />
    </div>
  );
}

export function ChangePinDrawer({
  onChangePin,
  onClose,
}: {
  onChangePin: (currentPin: string, newPin: string) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const confirmMismatch =
    confirmPin.length > 0 && newPin !== confirmPin ? "PINs don't match." : undefined;

  const canSubmit =
    validPin(currentPin) &&
    validPin(newPin) &&
    validPin(confirmPin) &&
    newPin === confirmPin &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await onChangePin(currentPin.trim(), newPin.trim());
      toast("PIN changed", { tone: "success" });
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
      title="Change your PIN"
      subtitle="Your account"
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
            Save changes
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <FormField
        label="Current PIN"
        required
        error={fieldErrors.currentPin}
      >
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <PinInput
            id={id}
            describedBy={describedBy}
            invalid={invalid}
            value={currentPin}
            onChange={setCurrentPin}
            placeholder="••••"
          />
        )}
      </FormField>

      <FormField label="New PIN" required error={fieldErrors.newPin}>
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <PinInput
            id={id}
            describedBy={describedBy}
            invalid={invalid}
            value={newPin}
            onChange={setNewPin}
            placeholder="1234"
          />
        )}
      </FormField>

      <FormField label="Confirm new PIN" required error={confirmMismatch}>
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <PinInput
            id={id}
            describedBy={describedBy}
            invalid={invalid}
            value={confirmPin}
            onChange={setConfirmPin}
            placeholder="1234"
          />
        )}
      </FormField>
    </Drawer>
  );
}
