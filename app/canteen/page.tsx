// The Canteen Mobile Operations Hub content, exported from Paper artboard 9BA-0 (Design
// Sprint Session 4c). It renders as the *content* of the staff shell (header + bottom nav
// are the shell's, from components/layout/staff-shell-client.tsx) — do NOT wrap it in
// another shell here.
//
// TODO(mock): the hub's data (persistent incoming-transfer banner, Canteen Workflows row
// states, today's canteen log) is fixture data — see
// docs/design/screens/canteen-mobile-operations-hub/fixtures.ts. A Development Sprint
// (milestone-1-plan.md §5 Session 8) wires it to lib/domain/stock.
import CanteenMobileOperationsHubScreen from "@/docs/design/screens/canteen-mobile-operations-hub/page";

export default function CanteenHomePage() {
  return (
    <div className="flex w-full flex-col py-(--sp-6)">
      <CanteenMobileOperationsHubScreen />
    </div>
  );
}
