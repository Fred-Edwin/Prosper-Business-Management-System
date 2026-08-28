// Canteen Mobile Operations Hub — the *content* of the staff shell (header
// + bottom nav are the shell's, from components/layout/staff-shell-client.tsx).
//
// Session 12: composed from the proven kit and wired to the F2 stock API
// (see ./hub-client.tsx). ADR-44 — the kit is the visual acceptance target
// here; the Session-4b artboard 9BA-0 is superseded.
import { CanteenHubClient } from "./hub-client";

export default function CanteenHomePage() {
  return <CanteenHubClient locationLabel="Canteen" />;
}
