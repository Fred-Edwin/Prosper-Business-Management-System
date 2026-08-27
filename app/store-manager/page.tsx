// The Store Manager Mobile Hub content, exported from Paper artboard 8T3-0 (Design Sprint
// Session 4c). It renders as the *content* of the staff shell (header + bottom nav +
// sticky action bar are the shell's, from components/layout/staff-shell-client.tsx) — do
// NOT wrap it in another shell here.
//
// TODO(mock): the hub's data (persistent transfer/purchase-delivery banners, Quick
// Operations counts, today's movement log) is fixture data — see
// docs/design/screens/store-manager-mobile-hub/fixtures.ts. A Development Sprint
// (milestone-1-plan.md §5 Session 8) wires it to lib/domain/stock.
import StoreManagerMobileHubScreen from "@/docs/design/screens/store-manager-mobile-hub/page";

export default function StoreManagerHomePage() {
  return (
    <div className="flex w-full flex-col py-(--sp-6)">
      <StoreManagerMobileHubScreen />
    </div>
  );
}
