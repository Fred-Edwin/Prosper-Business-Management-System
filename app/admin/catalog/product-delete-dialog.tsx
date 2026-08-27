// Wired from docs/design/screens/product-delete-dialog/page.tsx (Paper artboard 797-0).
// A pure component swap onto the kit <FrictionDeleteDialog> (ADR-36c label props);
// this file adds only the hardDelete call and the 409 CONFLICT → "Archive instead"
// fallback. components/kit/* is not touched.
"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
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
  // Once a hard delete comes back 409, the product has history — from then
  // on the only offered path is Archive.
  const [blockedByHistory, setBlockedByHistory] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setBlockedByHistory(false);
      setError(null);
      setBusy(false);
    }
  }, [open, product]);

  if (!open || !product) return null;

  async function handleConfirm() {
    if (!product || busy) return;
    setBusy(true);
    setError(null);
    try {
      // FrictionDeleteDialog only fires onConfirm when the typed string
      // already equals recordName, so product.name is the confirmed value.
      await onHardDelete(product.id, product.name);
      onClose();
    } catch (e) {
      if (e instanceof CatalogRequestError && e.status === 409) {
        setBlockedByHistory(true);
        setError(e.message);
      } else if (e instanceof CatalogRequestError && e.field === "confirmName") {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Could not delete the product.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!product || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onArchive(product.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive the product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-(--sp-4)">
      <FrictionDeleteDialog
        open={open}
        onClose={onClose}
        onConfirm={handleConfirm}
        onArchive={handleArchive}
        recordName={product.name}
        title="Delete Product"
        bodyCopy={
          blockedByHistory
            ? "This product has historical transactions and cannot be permanently deleted. Archive it instead to hide it without data loss."
            : BODY_COPY
        }
        confirmLabel="Permanently Delete"
        showArchiveLink
      />
      {error && (
        <div className="font-ui text-danger text-caption/micro px-(--sp-8)">
          {error}
        </div>
      )}
    </div>
  );
}
