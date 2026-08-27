// The Cashier New Order screen is a later milestone — the shell (header, bottom nav,
// sticky action bar) is real; this page's content is not. Uses the EmptyState kit
// component (ADR-36d) rather than an inline placeholder.
import { EmptyState } from "@/components/kit/empty-state";

export default function CashierHomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <EmptyState
        title="New order is coming in a later sprint"
        description="You're signed in and this shell is real — the order screen isn't built yet."
      />
    </div>
  );
}
