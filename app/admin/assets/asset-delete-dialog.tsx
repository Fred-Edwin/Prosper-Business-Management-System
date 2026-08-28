// Session 13 — Asset delete, composed from the kit <FrictionDeleteDialog>
// with the ADR-36c per-entity props: "Delete Asset Record" / "Keep Asset",
// showArchiveLink={false} (an asset has no archive-instead affordance — a
// used asset simply can't be hard-deleted). The artboard (8IV-0) was
// already a clean kit composition (Session 2 rebuild), so it is the direct
// visual target here — no ADR-44 divergence.
//
// Blocked path: when the hard-delete comes back 409 CONFLICT (the asset has
// linked history), the dialog switches to its can't-delete body copy and
// the only remaining action is Soft-delete — not a raw error toast.
"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { useToast } from "@/components/kit/toast";
import type { AssetView } from "@/lib/domain/assets";
import { AssetRequestError } from "./use-assets";

const BODY_COPY =
  "You are about to permanently delete this asset. This will erase its cost basis from the physical asset register and audit log. This cannot be undone.";

const BLOCKED_COPY =
  "This asset has linked history and cannot be permanently deleted. Soft-delete it instead to hide it from the register without data loss.";

export type AssetDeleteDialogProps = {
  open: boolean;
  asset: AssetView | null;
  onClose: () => void;
  onHardDelete: (id: string, confirmName: string) => Promise<void>;
  onSoftDelete: (id: string) => Promise<void>;
};

export function AssetDeleteDialog({
  open,
  asset,
  onClose,
  onHardDelete,
  onSoftDelete,
}: AssetDeleteDialogProps) {
  const { toast } = useToast();
  // Once a hard delete comes back 409, the asset has history — from then on
  // the only offered path is soft-delete.
  const [blockedByHistory, setBlockedByHistory] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setBlockedByHistory(false);
      setBusy(false);
    }
  }, [open, asset]);

  if (!open || !asset) return null;

  async function handleConfirm() {
    if (!asset || busy) return;
    setBusy(true);
    try {
      // FrictionDeleteDialog only fires onConfirm when the typed string
      // already equals recordName, so asset.name is the confirmed value.
      await onHardDelete(asset.id, asset.name);
      toast("Asset deleted", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof AssetRequestError && e.status === 409) {
        // Blocked: switch the dialog to its can't-delete state (copy +
        // soft-delete affordance) rather than firing a raw error toast.
        setBlockedByHistory(true);
      } else if (e instanceof AssetRequestError && e.field === "confirmName") {
        toast(e.message, { tone: "danger" });
      } else {
        toast(
          e instanceof Error ? e.message : "Could not delete the asset.",
          { tone: "danger" },
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSoftDelete() {
    if (!asset || busy) return;
    setBusy(true);
    try {
      await onSoftDelete(asset.id);
      toast("Asset removed from the register", { tone: "success" });
      onClose();
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not remove the asset.",
        { tone: "danger" },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <FrictionDeleteDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      onArchive={blockedByHistory ? handleSoftDelete : undefined}
      submitting={busy}
      recordName={asset.name}
      title="Delete Asset Record"
      bodyCopy={blockedByHistory ? BLOCKED_COPY : BODY_COPY}
      cancelLabel="Keep Asset"
      confirmLabel="Delete Asset Record"
      showArchiveLink={blockedByHistory}
    />
  );
}
