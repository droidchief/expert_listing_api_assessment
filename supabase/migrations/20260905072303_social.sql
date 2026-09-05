CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (follower_id, followee_id),
  CONSTRAINT chk_no_self_follow CHECK (follower_id <> followee_id)
);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type media_type NOT NULL DEFAULT 'image',
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  thumbnail_url text,
  blurhash text,
  duration_seconds integer NOT NULL DEFAULT 5 CHECK (duration_seconds BETWEEN 1 AND 60),
  caption text CHECK (char_length(caption) <= 300),
  linked_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  status content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),

  CONSTRAINT chk_expiry_after_creation CHECK (expires_at > created_at)
);

COMMENT ON COLUMN stories.expires_at IS 'Expiry is enforced by a filter on read, not a cron job; no scheduled cleanup exists or is needed.';

-- Drives the green (unseen) vs grey (seen) ring on the stories rail.
CREATE TABLE story_views (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,

  PRIMARY KEY (story_id, viewer_id)
);
