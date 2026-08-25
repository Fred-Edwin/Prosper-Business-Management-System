// Screens for this route arrive in later sprints — the shell itself
// (header, bottom nav, sticky action bar) is real; this page's content is not.
//
// TODO(mock): not a kit component — "Empty State" isn't in the approved
// 16-artboard component inventory (docs/design/design-principles.md §7),
// so this is an inline placeholder per sprint-06 handover guidance, not
// a one-off invented into components/kit. Replace with the real
// Canteen Mobile Operations Hub screen once wired to live data.
export default function CanteenHomePage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center">
      <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">Stock count screens are coming in a later sprint</h2>
      <p className="font-ui text-sm/sm text-text-secondary">You&apos;re signed in and this shell is real — the content here isn&apos;t built yet.</p>
    </div>
  );
}
