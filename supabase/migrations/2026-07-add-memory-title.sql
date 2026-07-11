-- Adds a title field to memories, separate from caption -- for video
-- memories this gets auto-filled from the source platform's real title
-- (via oEmbed) rather than only ever being manually typed.
alter table memories add column if not exists title text;
