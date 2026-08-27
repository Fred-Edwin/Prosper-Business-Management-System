import StoreManagerFlowsIssuesProductionScreen from "@/docs/design/screens/store-manager-flows-issues-production/page";

// The artboard draws two full phone screens side by side; the skeleton renders them as
// sibling phone frames, so no extra mobile-width wrapper is needed here.
export default function Page() {
  return (
    <div className="p-(--sp-9)">
      <StoreManagerFlowsIssuesProductionScreen />
    </div>
  );
}
