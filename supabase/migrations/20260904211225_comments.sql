CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  -- Denormalised so a whole thread loads in one query rather than a recursive CTE.
  root_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  depth smallint NOT NULL DEFAULT 0 CHECK (depth IN (0, 1)),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  reply_count integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  is_edited boolean NOT NULL DEFAULT false,
  status content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Soft delete so a deleted comment with live replies can be tombstoned rather
  -- than collapsing the thread.
  deleted_at timestamptz,

  CONSTRAINT chk_depth_consistent CHECK (
    (parent_comment_id IS NULL AND depth = 0)
    OR (parent_comment_id IS NOT NULL AND depth = 1)
  )
);

COMMENT ON CONSTRAINT chk_depth_consistent ON comments IS 'Caps nesting at one reply level by construction, but cannot stop a depth=1 comment from pointing at a parent that is itself depth=1 — a guard trigger in Part 5 closes that hole.';
