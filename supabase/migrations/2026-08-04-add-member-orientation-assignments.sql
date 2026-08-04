-- Lets an admin give a specific member a custom subset of orientation
-- steps instead of the full checklist. A member with zero rows here sees
-- every orientation_steps row (the default, unchanged behavior); a member
-- with one or more rows sees ONLY those steps -- see
-- lib/orientationAssignments.ts, the one place both interpretations are
-- applied, shared by the portal page and its two API routes.
create table if not exists member_orientation_assignments (
  member_id uuid not null references members(id) on delete cascade,
  orientation_step_id uuid not null references orientation_steps(id) on delete cascade,
  primary key (member_id, orientation_step_id)
);
