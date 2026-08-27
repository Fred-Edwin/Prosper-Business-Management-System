// The Admin Dashboard screen is a later milestone — the shell (nav, top bar,
// maximize toggle) is real; this page's content is not. Uses the EmptyState kit
// component (ADR-36d) rather than an inline placeholder.
import { EmptyState } from "@/components/kit/empty-state";

export default function AdminHomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <EmptyState
        title="Dashboard is coming in a later sprint"
        description="You're signed in and this shell is real — the dashboard screen isn't built yet."
      />
    </div>
  );
}
