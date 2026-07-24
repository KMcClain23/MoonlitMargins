-- Two-letter US state code, used by the public "Find a Sister" directory's
-- nearby-state search (see src/lib/stateAdjacency.ts and
-- GET /api/directory/nearby). Nullable -- not every member has given a
-- state, and a null state simply means that member never appears in the
-- directory rather than erroring.
alter table members
  add column if not exists state text;
