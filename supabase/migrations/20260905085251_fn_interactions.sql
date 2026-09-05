-- toggle_post_like: backs POST /posts/:id/like. The Flutter client sends an explicit
-- true/false so a network retry is safe; NULL flips whichever state currently holds.
CREATE OR REPLACE FUNCTION toggle_post_like(
  p_post_id uuid,
  p_user_id uuid,
  p_desired boolean DEFAULT NULL
) RETURNS TABLE (liked boolean, like_count integer)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_exists boolean;
  v_target boolean;
BEGIN
  PERFORM 1 FROM posts WHERE id = p_post_id AND deleted_at IS NULL AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'post not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_exists;

  v_target := COALESCE(p_desired, NOT v_exists);

  -- Each branch is independently idempotent (INSERT ... ON CONFLICT DO NOTHING, or a
  -- DELETE matching zero rows), which is what makes retrying this endpoint safe.
  IF v_target THEN
    INSERT INTO post_likes (post_id, user_id) VALUES (p_post_id, p_user_id) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id;
  END IF;

  -- Read like_count after the write so the trigger's effect is included.
  RETURN QUERY
  SELECT v_target, p.like_count FROM posts p WHERE p.id = p_post_id;
END $$;

-- get_post_comments: backs GET /posts/:id/comments. Returns root comments only, each
-- with up to 2 embedded replies via LATERAL on root_comment_id (populated by the
-- Part 5 comment_guard trigger).
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id           uuid,
  p_limit             int         DEFAULT 21,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         uuid        DEFAULT NULL,
  p_sort              text        DEFAULT 'newest'
) RETURNS TABLE (
  id uuid,
  post_id uuid,
  body text,
  like_count integer,
  reply_count integer,
  is_edited boolean,
  created_at timestamptz,
  author jsonb,
  replies_preview jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_sort = 'oldest' THEN
    RETURN QUERY
    SELECT
      c.id, c.post_id, c.body, c.like_count, c.reply_count, c.is_edited, c.created_at,
      jsonb_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                          'avatar_url', u.avatar_url, 'role', u.role, 'is_verified', u.is_verified) AS author,
      replies.j AS replies_preview
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', r.id, 'body', r.body, 'created_at', r.created_at,
               'author', jsonb_build_object('username', ru.username,
                                             'display_name', ru.display_name,
                                             'avatar_url', ru.avatar_url)
             ) ORDER BY r.created_at ASC), '[]'::jsonb) AS j
      FROM (
        SELECT rc.id, rc.body, rc.created_at, rc.author_id FROM comments rc
        WHERE rc.root_comment_id = c.id AND rc.parent_comment_id IS NOT NULL AND rc.deleted_at IS NULL
        ORDER BY rc.created_at ASC LIMIT 2
      ) r
      JOIN users ru ON ru.id = r.author_id
    ) replies ON true
    -- matches idx_comments_post exactly
    WHERE c.post_id = p_post_id
      AND c.deleted_at IS NULL
      AND c.parent_comment_id IS NULL
      AND (p_cursor_created_at IS NULL
           OR (c.created_at, c.id) > (p_cursor_created_at, p_cursor_id))
    ORDER BY c.created_at ASC, c.id ASC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT
      c.id, c.post_id, c.body, c.like_count, c.reply_count, c.is_edited, c.created_at,
      jsonb_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                          'avatar_url', u.avatar_url, 'role', u.role, 'is_verified', u.is_verified) AS author,
      replies.j AS replies_preview
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', r.id, 'body', r.body, 'created_at', r.created_at,
               'author', jsonb_build_object('username', ru.username,
                                             'display_name', ru.display_name,
                                             'avatar_url', ru.avatar_url)
             ) ORDER BY r.created_at ASC), '[]'::jsonb) AS j
      FROM (
        SELECT rc.id, rc.body, rc.created_at, rc.author_id FROM comments rc
        WHERE rc.root_comment_id = c.id AND rc.parent_comment_id IS NOT NULL AND rc.deleted_at IS NULL
        ORDER BY rc.created_at ASC LIMIT 2
      ) r
      JOIN users ru ON ru.id = r.author_id
    ) replies ON true
    WHERE c.post_id = p_post_id
      AND c.deleted_at IS NULL
      AND c.parent_comment_id IS NULL
      AND (p_cursor_created_at IS NULL
           OR (c.created_at, c.id) < (p_cursor_created_at, p_cursor_id))
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT p_limit;
  END IF;
END $$;

-- create_post: backs POST /posts. Inserts the post and its media in one transaction so
-- a bad media row rolls back the post. Table CHECK constraints do the validating; a
-- 23514 propagating up (e.g. an invalid post_type/transaction_type pairing) is correct.
CREATE OR REPLACE FUNCTION create_post(
  p_author_id uuid,
  p_payload   jsonb
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_post_id uuid;
  v_media jsonb;
BEGIN
  INSERT INTO posts (
    author_id, post_type, body, transaction_type, location_id, location_label,
    latitude, longitude, price_amount, price_currency, price_period,
    is_price_negotiable, bedrooms, bathrooms, parking_spaces, property_size_sqm,
    amenities, available_from, inspection_at
  ) VALUES (
    p_author_id,
    (p_payload->>'post_type')::post_type,
    p_payload->>'body',
    (p_payload->>'transaction_type')::transaction_type,
    (p_payload->>'location_id')::uuid,
    p_payload->>'location_label',
    (p_payload->>'latitude')::numeric,
    (p_payload->>'longitude')::numeric,
    (p_payload->>'price_amount')::numeric,
    COALESCE(p_payload->>'price_currency', 'NGN'),
    (p_payload->>'price_period')::price_period,
    COALESCE((p_payload->>'is_price_negotiable')::boolean, false),
    (p_payload->>'bedrooms')::smallint,
    (p_payload->>'bathrooms')::smallint,
    (p_payload->>'parking_spaces')::smallint,
    (p_payload->>'property_size_sqm')::numeric,
    COALESCE(
      (SELECT array_agg(elem #>> '{}')
       FROM jsonb_array_elements(COALESCE(p_payload->'amenities', '[]'::jsonb)) AS elem),
      '{}'
    ),
    (p_payload->>'available_from')::date,
    (p_payload->>'inspection_at')::timestamptz
  )
  RETURNING id INTO v_post_id;

  FOR v_media IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'media', '[]'::jsonb)) AS value
  LOOP
    INSERT INTO post_media (
      post_id, media_type, storage_path, public_url, thumbnail_url, blurhash,
      width_px, height_px, duration_seconds, mime_type, byte_size, alt_text, position
    ) VALUES (
      v_post_id,
      COALESCE((v_media->>'media_type')::media_type, 'image'),
      v_media->>'storage_path',
      v_media->>'public_url',
      v_media->>'thumbnail_url',
      v_media->>'blurhash',
      (v_media->>'width_px')::integer,
      (v_media->>'height_px')::integer,
      (v_media->>'duration_seconds')::integer,
      v_media->>'mime_type',
      (v_media->>'byte_size')::bigint,
      v_media->>'alt_text',
      COALESCE((v_media->>'position')::smallint, 0)
    );
  END LOOP;

  RETURN v_post_id;
END $$;
