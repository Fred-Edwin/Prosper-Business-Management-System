// Store Manager Mobile Hub — the *content* of the staff shell (header +
// bottom nav are the shell's, from components/layout/staff-shell-client.tsx).
//
// Session 12: composed from the proven kit and wired to the F2 stock API
// (see ./hub-client.tsx). ADR-44 — the kit is the visual acceptance target
// here; the Session-4b artboard 8T3-0 is superseded.
import { StoreManagerHubClient } from "./hub-client";

export default function StoreManagerHomePage() {
  return <StoreManagerHubClient locationLabel="Store" />;
}
