// Store Manager Mobile Hub — the *content* of the staff shell (header +
// bottom nav are the shell's, from components/layout/staff-shell-client.tsx).
//
// Session 12: composed from the proven kit and wired to the F2 stock API
// (see ./hub-client.tsx). ADR-44 — the kit is the visual acceptance target
// here; the Session-4b artboard 8T3-0 is superseded.
import { requireActingRole } from "@/lib/auth/session";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { StoreManagerHubClient } from "./hub-client";

export default async function StoreManagerHomePage() {
  // The manager's OWN location, resolved server-side. The hub used to
  // assume the "store"-type location, so a Restaurant store manager never
  // saw transfers addressed to the Restaurant (Canteen → Restaurant blue
  // forms, 2026-10-12).
  const session = await requireActingRole("store_manager");
  const myLocationId = await resolveActorLocationId(session);
  return (
    <StoreManagerHubClient locationLabel="Store" myLocationId={myLocationId} />
  );
}
