import StoreManagerFlowsTransfersConsumptionScreen from "@/docs/design/screens/store-manager-flows-transfers-consumption/page";

// The artboard draws two full phone screens side by side; the skeleton renders them as
// sibling phone frames, so no extra mobile-width wrapper is needed here.
export default function Page() {
  return (
    <div className="p-(--sp-9)">
      <StoreManagerFlowsTransfersConsumptionScreen />
    </div>
  );
}
