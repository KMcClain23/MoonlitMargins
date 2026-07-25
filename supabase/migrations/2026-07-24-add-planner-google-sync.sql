-- Flags a planner_events row that was created directly in Google
-- Calendar (not through the app) and pulled in by the incremental sync,
-- rather than the other way around -- lets the UI show "created in
-- Google Calendar" distinctly if useful.
alter table planner_events
  add column if not exists synced_from_google boolean not null default false;

-- Small generic key-value settings table -- currently only holds the
-- Google Calendar incremental-sync token (see src/lib/googleCalendar.ts),
-- but kept generic (not planner-specific) since it's a natural place for
-- any other future single-value app-wide state.
create table if not exists app_sync_state (
  key text primary key,
  value text
);
