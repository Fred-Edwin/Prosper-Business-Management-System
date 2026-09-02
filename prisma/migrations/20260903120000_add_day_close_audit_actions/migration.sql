-- M3 Session 1: Day Close goes live. Every close and every reopen writes an
-- `AuditLog` row — that trail is what preserves history under the owner's
-- low-friction reopen model (ADR-52). The `AuditAction` enum previously
-- carried only create / correct / soft_delete / hard_delete / login.
--
--   day_close  — an Admin sealed a business date
--   day_reopen — an Admin reopened a previously closed business date
--
-- Plain additive enum values. No table changes. `ADD VALUE` cannot run
-- inside a transaction on older PostgreSQL, so each is its own statement.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'day_close';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'day_reopen';
