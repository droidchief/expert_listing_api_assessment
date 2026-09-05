CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_no_self_notify CHECK (actor_id IS NULL OR actor_id <> recipient_id)
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  details text CHECK (char_length(details) <= 1000),
  status report_status NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolution_note text CHECK (char_length(resolution_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_single_target CHECK (
    (post_id IS NOT NULL)::int
    + (comment_id IS NOT NULL)::int
    + (reported_user_id IS NOT NULL)::int = 1
  )
);

CREATE TABLE blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_on_match boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, name)
);

COMMENT ON TABLE saved_filters IS 'criteria is jsonb rather than columns because filter criteria are a fast-changing product surface and are never queried relationally.';

CREATE TABLE hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag citext NOT NULL UNIQUE CHECK (tag ~ '^[a-z0-9_]{1,50}$'),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE post_hashtags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,

  PRIMARY KEY (post_id, hashtag_id)
);

CREATE TABLE mentions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mentioned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_mention_single_target CHECK (
    (post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
  )
);
