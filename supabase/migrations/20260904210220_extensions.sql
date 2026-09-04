CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive username and email
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram search for the location typeahead
