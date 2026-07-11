-- Extends events with fields the Wix export actually tracked but the original
-- schema didn't capture: whether an event is free RSVP or ticketed, whether
-- it's been canceled (distinct from simply being in the past), and a cover
-- image slot (the old site used each guest author's book cover as the event
-- thumbnail -- worth supporting here too, uploaded per-event same as member
-- photos and memories).

alter table events
  add column if not exists registration_type text not null default 'rsvp'
  check (registration_type in ('rsvp', 'ticketing'));

alter table events
  add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled', 'canceled'));

alter table events
  add column if not exists cover_image_url text;
