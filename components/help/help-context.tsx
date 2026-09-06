// Wires the shell's "?" button to the screen's help panel. The button and the
// panel live in different parts of the tree (button in the shell header, panel
// mounted once by the provider), so this context is the channel between them.
//
// Mounted once in app/admin/admin-shell-client.tsx, inside the shells but
// around both of them, so one panel serves the desktop and mobile shell.
"use client";

import * as React from "react";

interface HelpContextValue {
  open: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const HelpContext = React.createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(
    () => ({
      open,
      openHelp: () => setOpen(true),
      closeHelp: () => setOpen(false),
    }),
    [open],
  );
  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

/** For the shell's HelpButton. Returns null outside a provider (e.g. specs). */
export function useHelp(): HelpContextValue | null {
  return React.useContext(HelpContext);
}
