import CanteenTransferDispatchScreen from "@/docs/design/screens/canteen-transfer-dispatch/page";

// A full phone screen (its own header + sticky bar), so no extra mobile-width wrapper is
// needed here.
export default function Page() {
  return (
    <div className="mx-auto w-[390px] border-x border-solid border-border-subtle">
      <CanteenTransferDispatchScreen />
    </div>
  );
}
