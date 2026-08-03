-- Durable record of a member's orientation check-in to her assigned mentor,
-- independent of whether the push notification / email side-channels
-- (sent on top of this insert, see api/portal/orientation/check-in/route.ts)
-- actually reach anyone -- Resend still isn't configured with a verified
-- domain, so email delivery failure is the current default, not an edge
-- case, and this table is what keeps a check-in from being silently lost.
create table if not exists mentor_check_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  mentor_admin_user_id uuid not null references admin_users(id),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mentor_check_ins_mentor_admin_user_id_idx on mentor_check_ins (mentor_admin_user_id);
