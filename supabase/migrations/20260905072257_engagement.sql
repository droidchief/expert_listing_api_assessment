CREATE TABLE post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (post_id, user_id)
);

COMMENT ON TABLE post_likes IS 'Composite primary key (post_id, user_id) makes POST /posts/:id/like idempotent: a duplicate like is impossible at the storage layer, so the endpoint is safe to retry on a flaky mobile network.';

CREATE TABLE comment_likes (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE bookmarks (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collection_name text CHECK (char_length(collection_name) <= 60),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, post_id)
);

-- Append-only event log, deliberately not deduplicated: a repeat share is a real event.
CREATE TABLE post_shares (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  channel share_channel NOT NULL DEFAULT 'copy_link',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE post_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text CHECK (char_length(session_id) <= 128),
  source view_source NOT NULL DEFAULT 'feed',
  -- A DEFAULT, not GENERATED: timezone(text, timestamptz) is STABLE, not IMMUTABLE
  -- (timezone definitions can change), and generated columns require an immutable
  -- expression. A default is evaluated once at insert time and may be volatile,
  -- giving the same one-row-per-user-per-post-per-UTC-day behaviour. Do not
  -- "fix" this back to GENERATED — it will fail to migrate.
  dedupe_day date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index (allowed exception): enforces one counted view per
-- logged-in user per post per UTC day, while leaving anonymous views uncapped.
CREATE UNIQUE INDEX uq_post_views_daily
  ON post_views (post_id, viewer_id, dedupe_day)
  WHERE viewer_id IS NOT NULL;
