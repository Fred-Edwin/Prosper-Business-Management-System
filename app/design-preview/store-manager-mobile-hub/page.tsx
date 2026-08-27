import StoreManagerMobileHubScreen from "@/docs/design/screens/store-manager-mobile-hub/page";

// The hub renders inside the staff shell in the real app; for the design preview we
// wrap the content alone at the mobile artboard width.
export default function Page() {
  return (
    <div className="mx-auto flex w-[390px] flex-col border-x border-solid border-border-subtle bg-surface-page py-(--sp-6)">
      <StoreManagerMobileHubScreen />
    </div>
  );
}
