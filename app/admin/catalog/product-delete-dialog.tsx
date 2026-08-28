// Session 11 rebuild — composed from the kit <FrictionDeleteDialog> (ADR-36c
// label props). The previous version left `submitting` unwired and rendered the
// error as a sibling <div>; now `busy` drives the dialog's loading state and
// failures surface as a danger <Toast>. The hardDelete call, the 409 CONFLICT ->
// "Archive instead" fallback, and the archive path are preserved verbatim.
"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { useToast } from "@/components/kit/toast";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { CatalogRequestError } from "./use-catalog";

const BODY_COPY =
  "You are about to permanently delete this product. This will erase it and all its pricing records from the catalog and audit log. This cannot be undone.";

export type ProductDeleteDialogProps = {
  open: boolean;
  product: ProductWithLocations | null;
  onClose: () => void;
  onHardDelete: (id: string, confirmName: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
};

export function ProductDeleteDialog({
  open,
  product,
  onClose,
  onHardDelete,
  onArchive,
}: ProductDeleteDialogProps) {
  const { toast } = useToast();
  // Once a hard delete comes back 409, the product has history — from then
  // on the only offered path is Archive.
  const [blockedByHistory, setBlockedByHistory] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setBlockedByHistory(false);
      setBusy(false);
    }
  }, [open, product]);

  if (!open || !product) return null;

  async function handleConfirm() {
    if (!product || busy) return;
    setBusy(true);
    try {
      // FrictionDeleteDialog only fires onConfirm when the typed string
      // already equals recordName, so product.name is the confirmed value.
      await onHardDelete(product.id, product.name);
      toast("Product deleted", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof CatalogRequestError && e.status === 409) {
        setBlockedByHistory(true);
        toast(e.message, { tone: "danger" });
      } else if (e instanceof CatalogRequestError && e.field === "confirmName") {
        toast(e.message, { tone: "danger" });
      } else {
        toast(
          e instanceof Error ? e.message : "Could not delete the product.",
          { tone: "danger" },
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!product || busy) return;
    setBusy(true);
    try {
      await onArchive(product.id);
      toast("Product archived", { tone: "success" });
      onClose();
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not archive the product.",
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
      onArchive={handleArchive}
      submitting={busy}
      recordName={product.name}
      title="Delete Product"
      bodyCopy={
        blockedByHistory
          ? "This product has historical transactions and cannot be permanently deleted. Archive it instead to hide it without data loss."
          : BODY_COPY
      }
      cancelLabel="Keep Product"
      confirmLabel="Delete Product"
      showArchiveLink
    />
  );
}
