// Public surface of the audit domain module (ADR-52). Route handlers and
// other domain modules import from here:
//   import { assertDayOpen, closeDay } from "@/lib/domain/audit"

export { DomainError } from "./errors";
export * from "./types";

export {
  isDayClosed,
  assertDayOpen,
  assertActorMayCorrectOnDate,
  assertStaffDateIsToday,
  type DateOrBusinessDate,
} from "./day-close-guard";
export { closeDay, reopenDay } from "./close-day";
export { listDayCloses, getDayStatus } from "./list-day-closes";
export { listAuditLog, flattenAuditItems } from "./list-audit-log";
export { getDayDetail } from "./get-day-detail";
