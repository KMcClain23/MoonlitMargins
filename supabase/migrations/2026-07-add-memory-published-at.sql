-- Stores the content's real publish date (e.g. a YouTube video's actual
-- upload date), separate from created_at (which only reflects when the row
-- was added to this database -- meaningless for sort order when memories
-- get bulk-imported well after the fact, or in a different order than they
-- were originally posted).
alter table memories add column if not exists published_at timestamptz;
