/**
 * Suppliers & Vendors domain shapes. A pure lookup entity — no ledger, no
 * derived balance (unlike Customer). It exists solely to back the
 * supplier/vendor dropdown on purchase payments (Stock/Financials) and
 * expenses. See the `Supplier` model comment in schema.prisma for why this
 * stays a denormalized display string on `StockMovement`/`Expense` rather
 * than a hard FK.
 */

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  note?: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListSuppliersFilter = {
  /** Case-insensitive contains, matched against name. */
  search?: string;
  /**
   * When true, includes archived suppliers (`deletedAt` set). Defaults to
   * false — archived suppliers are hidden from the dropdown by default so a
   * vendor marked inactive can't be picked for a new payment by accident.
   */
  includeArchived?: boolean;
};

/** Acting-user context for supplier mutations. */
export type SupplierContext = {
  actorId: string;
};
