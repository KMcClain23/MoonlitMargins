-- Distinguishes an automated orientation-completion notice from a
-- member's own check-in message -- both land in the same mentor_check_ins
-- inbox (see api/portal/orientation/[stepId]/complete/route.ts), but the
-- admin UI (MentorCheckInsBell.tsx) renders them with a different icon so
-- a mentor can tell at a glance which is which.
alter table mentor_check_ins
  add column if not exists is_system_generated boolean not null default false;
