// ADR-56 — single admin header row. The AdminShell owns the one header row
// (page title left, page actions right, account avatar rightmost); the page
// that renders inside the shell owns its title + actions but has no way to
// reach up into the shell's row. This context is that channel.
//
// A screen renders one <AdminPageHeader title=… actions=… /> at the top of its
// tree instead of passing a `toolbar` prop to <PageShell>. Inside the shell
// that publishes the content up to the shell's header row and renders nothing
// itself. Outside a provider (a screen spec rendering the client directly) it
// renders the title + actions inline in a <header> so assertions still find
// them. <PageShell> stays in use for width / padding, just without `toolbar`.
"use client";

import * as React from "react";

export interface AdminToolbarContent {
  /** Page title — a string, or a node (e.g. a <Breadcrumb>) that stands in for it. */
  title?: React.ReactNode;
  /** Page actions — buttons, a date picker, etc. Rendered right-aligned. */
  actions?: React.ReactNode;
}

interface AdminToolbarContextValue {
  content: AdminToolbarContent;
  setContent: (content: AdminToolbarContent) => void;
}

const AdminToolbarContext = React.createContext<AdminToolbarContextValue | null>(
  null,
);

// M2 S6b mounts `children` twice — once inside the desktop shell, once inside
// the mobile shell (CSS `hidden md:block` / `md:hidden` picks which is seen).
// Both copies of a screen register their header content into this ONE
// provider, so without a guard the last one to call setContent wins the
// header regardless of which shell is actually visible — the header can end
// up bound to the hidden copy's state. AdminVisibleContext tells a screen's
// <AdminPageHeader> whether ITS mount is the visible one; only the visible
// mount's setContent calls are allowed through.
const AdminVisibleContext = React.createContext(true);

/** True inside the shell wrapper that's currently visible (media query, not CSS display). */
export function useAdminShellVisible(): boolean {
  return React.useContext(AdminVisibleContext);
}

/** Wraps one shell's `children` so its <AdminPageHeader> knows if it's the visible copy. */
export function AdminShellVisibility({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminVisibleContext.Provider value={visible}>
      {children}
    </AdminVisibleContext.Provider>
  );
}

export function AdminToolbarProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = React.useState<AdminToolbarContent>({});
  const value = React.useMemo(() => ({ content, setContent }), [content]);
  return (
    <AdminToolbarContext.Provider value={value}>
      {children}
    </AdminToolbarContext.Provider>
  );
}

/** The shell reads this to render the page's registered header content. */
export function useAdminToolbarValue(): AdminToolbarContent {
  const ctx = React.useContext(AdminToolbarContext);
  return ctx?.content ?? {};
}

/**
 * The one header for an admin screen. Render it once at the top of the screen's
 * JSX, in place of `<PageShell toolbar=…>`.
 *
 * - Inside <AdminToolbarProvider> (the real app): publishes `title` / `actions`
 *   into the shell's single header row and renders nothing here.
 * - Outside a provider (screen specs): renders `title` + `actions` inline in a
 *   <header>, so `getByRole("heading", { level: 1 })` etc. still resolve.
 */
export function AdminPageHeader({ title, actions }: AdminToolbarContent) {
  const ctx = React.useContext(AdminToolbarContext);
  const visible = React.useContext(AdminVisibleContext);
  const setContent = ctx?.setContent;

  React.useEffect(() => {
    if (!setContent || !visible) return;
    setContent({ title, actions });
    return () => setContent({});
  }, [setContent, visible, title, actions]);

  if (ctx) return null;

  return (
    <header className="flex items-center gap-(--sp-4) px-(--sp-8) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      {typeof title === "string" ? (
        <h1 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
          {title}
        </h1>
      ) : (
        title
      )}
      {actions && (
        <>
          <div className="grow" />
          {actions}
        </>
      )}
    </header>
  );
}
