// The Store Manager Mobile Hub screen lands in Session 4 (screen re-export) — the
// shell (header, bottom nav, sticky action bar) is real; this page's content is a
// placeholder until then. Uses the EmptyState kit component (ADR-36d).
import { EmptyState } from "@/components/kit/empty-state";

export default function StoreManagerHomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <EmptyState
        title="The Store Manager hub is being wired up"
        description="You're signed in and this shell is real — the hub screen lands in an upcoming sprint."
      />
    </div>
  );
}
