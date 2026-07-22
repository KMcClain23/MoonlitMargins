-- Powers the unread-message indicator (mobile tab badge + per-conversation
-- unread count): tracks when each participant last fetched a
-- conversation's messages, so unread counts can be computed as
-- "messages from someone else, created after this timestamp."
alter table conversation_participants
  add column if not exists last_read_at timestamptz;
