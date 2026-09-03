// Public surface of the staff domain module (Staff & Pay, PRD §4.8).
// Route handlers import from here:
//   import { createStaff, getPayrollSummary } from "@/lib/domain/staff";

export { DomainError } from "./errors";
export * from "./types";

export { createStaff } from "./create-staff";
export { updateStaff } from "./update-staff";
export { deactivateStaff } from "./deactivate-staff";
export { listStaff, getStaff, type ListStaffFilter } from "./list-staff";

export {
  setAttendance,
  setAttendanceBulk,
  listAttendance,
  type AttendanceView,
  type BulkAttendanceEntry,
} from "./attendance";

export {
  recordPayAdjustment,
  getStaffPay,
  getPayrollSummary,
  payStaff,
  payAllUnpaid,
  type PayAdjustmentType,
  type PayAdjustmentView,
  type RecordPayAdjustmentInput,
  type StaffPay,
  type StaffPayoutView,
  type PayrollSummary,
  type PayStaffInput,
  type PayAllUnpaidInput,
  type PayAllUnpaidResult,
} from "./pay";
