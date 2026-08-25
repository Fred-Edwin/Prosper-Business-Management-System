// TODO(mock): replace with real asset create/edit form wiring (lib/domain/assets) once wired.
// Extracted verbatim from Paper artboard "Asset Drawer — Create / Edit" (8JO-0).
import type { AssetCondition } from "@/components/kit/condition-chip";

export const assetDrawerMock = {
  title: "Register New Asset",
  assetName: "Commercial Deep Fryer Double",
  category: "Kitchen Equipment",
  location: "Restaurant Kitchen",
  condition: "good" as AssetCondition,
  purchaseDate: "Jan 15, 2025",
  costBasis: "45,000.00",
  maintenanceNotesLabel: "Maintenance & Usage Notes",
  maintenanceNotes: "Installed near ventilation unit #2. Tested with 3-phase power adapter.",
};

export const assetConditionOptions: { value: AssetCondition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "decommissioned", label: "Decommissioned" },
];
