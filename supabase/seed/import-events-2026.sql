-- Imports the 25 real events from the Wix "event-list" export.
--
-- Three rows from the export were deliberately left out of this file:
--   "Deep Dive Book Exploration Night"   (2025-10-29, New York, NY)
--   "Personalized Reading List Workshop" (2025-10-29, California)
--   "Enchanted Evenings with Authors"    (2025-10-29, Dallas, TX)
-- All three share the exact same millisecond-precision timestamp, are
-- CANCELED, and have generic template-sounding titles with real US city
-- locations -- unlike every other row here, which is a virtual TikTok Live
-- with no location set. This is the standard pattern of the three sample
-- events Wix pre-seeds into every new Events site. If any of these three
-- were real sisterhood events, let me know and I'll add them back in.
--
-- Also worth a second look: rows 21 and 25 below ("Dani Staro..." and
-- "Dani Starro...") are spelled differently -- may be the same event
-- duplicated with a typo, or two distinct events. Kept both as separate
-- rows since I can't tell which is correct; safe to delete one via the
-- admin panel if it turns out to be a duplicate.
--
-- All events are seeded as event_type = 'author_event' (TikTok Live guest
-- format) with no location (virtual) and no link_url -- add each TikTok
-- Live link and, if you have them, a book-cover image per event via the
-- admin panel's edit form.

insert into events (title, event_type, starts_at, registration_type, status)
values
  ('Sierra Simone & The Moonlit Margins Sisterhood', 'author_event', '2026-10-31T01:00:00Z', 'rsvp', 'scheduled'),
  ('Nicole Lenz & The Moonlit Margins Sisterhood', 'author_event', '2026-08-22T01:00:00Z', 'rsvp', 'scheduled'),
  ('A. B Owings & The Sisterhood', 'author_event', '2026-10-24T01:00:00Z', 'rsvp', 'scheduled'),
  ('William Madison & The Moonlit Sisterhood', 'author_event', '2026-10-17T01:00:00Z', 'rsvp', 'scheduled'),
  ('Ruby & Special Surprise Guests :)', 'author_event', '2026-10-10T01:00:00Z', 'rsvp', 'scheduled'),
  ('Robb Moreira & The Moonlit Margins Sisterhood', 'author_event', '2026-09-26T01:00:00Z', 'rsvp', 'scheduled'),
  ('Heather Firth & The Sisterhood', 'author_event', '2026-09-19T01:00:00Z', 'rsvp', 'scheduled'),
  ('Gregory Salinas, L.K Kagey and Savannah Thomas & The Sisterhood', 'author_event', '2026-09-12T01:00:00Z', 'rsvp', 'scheduled'),
  ('James Cassidy & The Moonlit Margins Sisterhood', 'author_event', '2026-08-15T01:00:00Z', 'rsvp', 'scheduled'),
  ('Michelle Sparks & The Moonlit Margins Sisterhood', 'author_event', '2026-07-25T01:00:00Z', 'rsvp', 'scheduled'),
  ('Cedar James & The Moonlit Margins Sisterhood', 'author_event', '2026-07-18T01:00:00Z', 'rsvp', 'scheduled'),
  ('Carmen Seantel & The Sisterhood', 'author_event', '2026-07-11T01:00:00Z', 'rsvp', 'scheduled'),
  ('CJ Sweet & The Moonlit Margins Sisterhood', 'author_event', '2026-06-20T01:00:00Z', 'rsvp', 'scheduled'),
  ('Mila Crawford & The Moonlit Margins Sisterhood', 'author_event', '2026-06-13T01:00:00Z', 'rsvp', 'scheduled'),
  ('Steph Macca & The Moonlit Margins Sisterhood', 'author_event', '2026-05-23T01:00:00Z', 'rsvp', 'scheduled'),
  ('Luna Wicked, Anthony Palmini & Shiloh James', 'author_event', '2026-05-16T01:00:00Z', 'rsvp', 'scheduled'),
  ('Marie Lambert & The Moonlit Margins Sisterhood', 'author_event', '2026-05-09T01:00:00Z', 'rsvp', 'scheduled'),
  ('Branden Davis, Cole Banks & The Sisterhood', 'author_event', '2026-04-18T02:00:00Z', 'rsvp', 'scheduled'),
  ('Rachel Dane & The Sisterhood', 'author_event', '2026-04-11T01:00:00Z', 'rsvp', 'scheduled'),
  ('Dani Staro, Ellis Worth, Brandon Francis, and Robb Moreira', 'author_event', '2026-03-14T01:00:00Z', 'ticketing', 'scheduled'),
  ('Luna Wicked & The Sisterhood', 'author_event', '2026-03-21T01:00:00Z', 'rsvp', 'scheduled'),
  ('Hanna Harp & The Sisterhood', 'author_event', '2026-02-21T02:00:00Z', 'rsvp', 'scheduled'),
  ('Ivan Morea (masked up) & The Sisterhood', 'author_event', '2026-02-14T02:00:00Z', 'rsvp', 'scheduled'),
  ('Ruby M Darling and Andi Eloise', 'author_event', '2026-01-24T03:00:00Z', 'rsvp', 'scheduled'),
  ('Dani Starro, Ellis Worth, Brandon Francis, Robb Moreira', 'author_event', '2026-01-10T00:00:00Z', 'ticketing', 'scheduled');
