// The Admin Dashboard. M3-S1 gave it its first real content — the Day Close
// card (ADR-52). More dashboard sections land in later sprints; the shell
// (nav, top bar, maximize toggle) comes from app/admin/layout.tsx.
import { DayCloseClient } from "./day-close/day-close-client";

export default function AdminHomePage() {
  return <DayCloseClient />;
}
