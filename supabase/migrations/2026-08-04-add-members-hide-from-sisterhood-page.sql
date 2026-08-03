-- Distinct from hide_from_directory (which only affects the public "Find a
-- Sister" search) -- the /sisterhood page itself currently shows every
-- members row with no suppression flag at all. Needed for members rows
-- that exist purely to grant portal access to an admin_users account with
-- no roster presence of their own (see the admin Users/Members "grant
-- portal access" flow), which should never appear on the public site.
alter table members
  add column if not exists hide_from_sisterhood_page boolean not null default false;
