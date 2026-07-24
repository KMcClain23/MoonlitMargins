-- Lets an admin separately link a Google account for quick sign-in,
-- distinct from the email/password they log in with -- checked alongside
-- the login `email` column in findAdminUserByGoogleEmail(). Nullable
-- (most admins won't link one) and unique (one Google account can't be
-- linked to more than one admin_user).
alter table admin_users
  add column if not exists linked_google_email text unique;
