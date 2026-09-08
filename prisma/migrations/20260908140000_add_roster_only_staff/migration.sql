-- Roster-only (non-login) staff — cooks / casuals the owner wants on the
-- roster for attendance + pay, but who never use the app (PR 1 of the
-- staff-pay rework).
--
-- `staff.role` becomes NULLABLE and a `job_title` free-text column is
-- added. Exactly one of (role + a linked `user`) or (job_title, no user)
-- is set — enforced in `createStaff`, not the DB (there is no clean
-- single-table CHECK for "has a user row"). Nothing branches on
-- `job_title`; it is a display label only.
--
-- Every existing `staff` row has a non-null `role` and a linked `user`,
-- so this is a widening change with no data backfill.

-- AlterTable
ALTER TABLE "staff" ALTER COLUMN "role" DROP NOT NULL;
ALTER TABLE "staff" ADD COLUMN "job_title" TEXT;
