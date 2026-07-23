-- Android notification channel sound/vibration settings can't be changed
-- after the channel is created, so the client pre-creates multiple channel
-- variants and tells the server which one it currently wants pushes routed
-- to. iOS ignores this entirely.
alter table admin_push_tokens
  add column if not exists preferred_channel_id text not null default 'messages-default';
