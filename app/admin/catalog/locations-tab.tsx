// The Locations tab body for /admin/catalog (Session 9C). M1 shipped
// catalog product CRUD but left locations read-only; the Locations CRUD
// backend landed in M4 S8A (createLocation / updateLocation /
// deactivateLocation). This tab closes the UI gap.
//
// Composed from the frozen kit — <SimpleTable> (desktop) / a card list
// (< md) + <StatusChip> + <Button> + the <LocationDrawer> + a small confirm
// <Drawer> for deactivation. Sibling: ./products-tab.tsx right next door.
//
// DEACTIVATION. `deactivateLocation` runs a referential guard and returns
// 409 CONFLICT with a SPECIFIC message when the location still has active
// staff / stock on hand / a pending transfer. That message is surfaced
// verbatim in the confirm panel — never swallowed into a generic string.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { useToast } from "@/components/kit/toast";
import type { Location } from "@/lib/domain/catalog";
import { useLocations } from "./use-locations";
import { CatalogRequestError } from "./use-catalog";
import { LocationDrawer } from "./location-drawer";

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  canteen: "Canteen",
  store: "Store",
};

export type LocationsTabState = {
  countLabel: string;
  openCreate: () => void;
};

export function LocationsTab({
  onState,
}: {
  onState: (state: LocationsTabState) => void;
}) {
  const { locations, loading, error, create, update, deactivate } =
    useLocations();
  const { toast } = useToast();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Location | null>(null);

  // Deactivation confirm: the target, plus the guard's 409 message if it
  // came back blocked.
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<Location | null>(null);
  const [deactivateBusy, setDeactivateBusy] = React.useState(false);
  const [deactivateError, setDeactivateError] = React.useState<string | null>(
    null,
  );

  const openCreate = React.useCallback(() => {
    setSelected(null);
    setDrawerOpen(true);
  }, []);
  function openEdit(location: Location) {
    setSelected(location);
    setDrawerOpen(true);
  }

  const activeCount = locations.filter((l) => l.active).length;
  const countLabel = `${activeCount} active`;

  React.useEffect(() => {
    onState({ countLabel, openCreate });
  }, [onState, countLabel, openCreate]);

  function askDeactivate(location: Location) {
    setDeactivateTarget(location);
    setDeactivateError(null);
  }

  async function confirmDeactivate() {
    if (!deactivateTarget || deactivateBusy) return;
    setDeactivateBusy(true);
    setDeactivateError(null);
    try {
      await deactivate(deactivateTarget.id);
      toast("Location deactivated", { tone: "success" });
      setDeactivateTarget(null);
    } catch (e) {
      // Surface the domain's specific reason (active staff / stock on hand /
      // pending transfer) — do NOT collapse it to a generic message.
      if (e instanceof CatalogRequestError && e.code === "CONFLICT") {
        setDeactivateError(e.message);
      } else {
        setDeactivateError(
          e instanceof Error
            ? e.message
            : "Could not deactivate this location.",
        );
      }
    } finally {
      setDeactivateBusy(false);
    }
  }

  async function handleReactivate(location: Location) {
    try {
      await update(location.id, { active: true });
      toast("Location reactivated", { tone: "success" });
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not reactivate this location.",
        { tone: "danger" },
      );
    }
  }

  const columns: SimpleTableColumn<Location>[] = [
    {
      key: "name",
      header: "Name",
      width: "grow min-w-[200px]",
      cell: "strong",
      render: (r) => (
        <span className="flex items-center gap-(--sp-4)">
          {r.name}
          {!r.active && <StatusChip variant="neutral">Inactive</StatusChip>}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: "w-[140px]",
      render: (r) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-secondary)]">
          {TYPE_LABEL[r.type] ?? r.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[120px]",
      render: (r) =>
        r.active ? (
          <StatusChip variant="success">Active</StatusChip>
        ) : (
          <StatusChip variant="neutral">Inactive</StatusChip>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "w-[180px]",
      render: (r) => (
        <span className="flex items-center gap-(--sp-5)">
          {r.active ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(r);
                }}
                className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  askDeactivate(r);
                }}
                className="font-ui font-(--weight-medium) text-danger text-sm/micro kit-focus-ring rounded-sm"
              >
                Deactivate
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleReactivate(r);
              }}
              className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
            >
              Reactivate
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col grow gap-(--sp-8)">
      {error && (
        <div role="alert" className="font-ui text-danger text-sm/sm">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <SimpleTable
          columns={columns}
          rows={locations}
          rowKey={(r) => r.id}
          loading={loading && locations.length === 0}
          emptyState={{
            variant: "default",
            title: "No locations yet",
            description:
              "Add a location so products can be priced and stocked there.",
            actionLabel: "Add Location",
            onAction: openCreate,
          }}
        />
      </div>

      {/* Mobile card list */}
      <div className="flex md:hidden flex-col [width:100%]">
        {loading && locations.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
            Loading…
          </div>
        ) : locations.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-body/sm py-(--sp-4)">
            No locations yet.
          </div>
        ) : (
          locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-start justify-between [width:100%] py-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center gap-(--sp-4)">
                  <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
                    {loc.name}
                  </div>
                  {loc.active ? (
                    <StatusChip variant="success">Active</StatusChip>
                  ) : (
                    <StatusChip variant="neutral">Inactive</StatusChip>
                  )}
                </div>
                <div className="font-ui [color:var(--text-secondary)] text-sm/micro">
                  {TYPE_LABEL[loc.type] ?? loc.type}
                </div>
              </div>
              <div className="flex items-center gap-(--sp-5) shrink-0">
                {loc.active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(loc)}
                      className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => askDeactivate(loc)}
                      className="font-ui font-(--weight-medium) text-danger text-sm/micro kit-focus-ring rounded-sm"
                    >
                      Deactivate
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReactivate(loc)}
                    className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <LocationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        location={selected}
        onCreate={create}
        onUpdate={update}
      />

      {/* Deactivation confirm — a rail dialog so the 409 guard reason has
          room to display in full. */}
      <Drawer
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        variant="rail"
        title="Deactivate location"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
              disabled={deactivateBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              loading={deactivateBusy}
              disabled={deactivateBusy}
              className="grow"
            >
              Deactivate
            </Button>
          </>
        }
      >
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          {deactivateTarget && (
            <>
              Deactivate <strong>{deactivateTarget.name}</strong>? It will be
              hidden from pickers and reports. You can reactivate it later —
              nothing is deleted.
            </>
          )}
        </div>

        {deactivateError && (
          <div
            role="alert"
            className="flex flex-col p-(--sp-5) rounded-sm gap-(--sp-2) bg-danger-bg"
          >
            <div className="font-ui font-(--weight-semibold) text-danger text-sm/sm">
              Can’t deactivate this location
            </div>
            <div className="font-ui text-danger text-sm/sm">
              {deactivateError}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
