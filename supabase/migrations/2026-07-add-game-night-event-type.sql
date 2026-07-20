-- The "Game night" event type was added to the app (EventForm, admin API
-- schemas) but the events.event_type check constraint was never widened to
-- match, so creating a game_night event fails at the database layer with a
-- generic 500. Run this against the live Supabase project to fix it.

alter table events drop constraint events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('reading_sprint', 'tiktok_live', 'author_event', 'annual_meetup', 'game_night', 'other'));
