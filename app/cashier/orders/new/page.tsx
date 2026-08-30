// C2 New Order — build (+ C3 checkout sheet + C5 customer-attach sheet,
// both composed as <BottomSheet> overlays within the client). Staff shell
// comes from `app/cashier/layout.tsx`. Visual targets: `C6D-0` / `CGM-0`
// / `CJ7-0` (C2), `DLP-0`…`DRN-0` (C3), `D4S-0`…`D6K-0` (C5) — Paper.
import { NewOrderClient } from "./new-order-client";

export default function NewOrderPage() {
  return <NewOrderClient />;
}
