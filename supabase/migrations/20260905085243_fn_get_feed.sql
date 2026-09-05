-- get_feed: the main feed query (GET /posts). Called once per page load/scroll with a
-- keyset cursor. Solves the N+1 problem via LATERAL joins for media, top comment and
-- recent likers, so one call returns everything a feed card needs to render.
CREATE OR REPLACE FUNCTION get_feed(
  p_viewer_id           uuid,
  p_limit               int                DEFAULT 21,
  p_cursor_created_at   timestamptz        DEFAULT NULL,
  p_cursor_id           uuid               DEFAULT NULL,
  p_post_types          post_type[]        DEFAULT NULL,
  p_transaction_types   transaction_type[] DEFAULT NULL,
  p_location_ids        uuid[]             DEFAULT NULL,
  p_min_price           numeric            DEFAULT NULL,
  p_max_price           numeric            DEFAULT NULL,
  p_min_bedrooms        smallint           DEFAULT NULL,
  p_has_media           boolean            DEFAULT NULL,
  p_posted_after        timestamptz        DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  post_type post_type,
  body text,
  transaction_type transaction_type,
  location_id uuid,
  location_label text,
  latitude numeric,
  longitude numeric,
  price_amount numeric,
  price_currency char(3),
  price_period price_period,
  is_price_negotiable boolean,
  bedrooms smallint,
  bathrooms smallint,
  parking_spaces smallint,
  property_size_sqm numeric,
  amenities text[],
  available_from date,
  inspection_at timestamptz,
  like_count integer,
  comment_count integer,
  share_count integer,
  bookmark_count integer,
  view_count integer,
  media_count smallint,
  is_edited boolean,
  is_pinned boolean,
  created_at timestamptz,
  author jsonb,
  media jsonb,
  top_comment jsonb,
  liked_by jsonb,
  viewer_has_liked boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.post_type, p.body, p.transaction_type, p.location_id, p.location_label,
    p.latitude, p.longitude, p.price_amount, p.price_currency, p.price_period,
    p.is_price_negotiable, p.bedrooms, p.bathrooms, p.parking_spaces, p.property_size_sqm,
    p.amenities, p.available_from, p.inspection_at,
    p.like_count, p.comment_count, p.share_count, p.bookmark_count, p.view_count, p.media_count,
    p.is_edited, p.is_pinned, p.created_at,
    jsonb_build_object(
      'id', u.id, 'username', u.username, 'display_name', u.display_name,
      'avatar_url', u.avatar_url, 'avatar_blurhash', u.avatar_blurhash,
      'role', u.role, 'is_verified', u.is_verified, 'is_business', u.is_business
    ) AS author,
    media.j AS media,
    top_comment.j AS top_comment,
    liked_by.j AS liked_by,
    (vl.user_id IS NOT NULL) AS viewer_has_liked
  FROM posts p
  JOIN users u ON u.id = p.author_id AND u.deleted_at IS NULL

  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'id', m.id, 'media_type', m.media_type, 'url', m.public_url,
             'thumbnail_url', m.thumbnail_url, 'blurhash', m.blurhash,
             'width_px', m.width_px, 'height_px', m.height_px,
             'aspect_ratio', m.aspect_ratio, 'duration_seconds', m.duration_seconds,
             'alt_text', m.alt_text, 'position', m.position
           ) ORDER BY m.position), '[]'::jsonb) AS j
    FROM post_media m WHERE m.post_id = p.id
  ) media ON true

  LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', c.id, 'body', c.body, 'created_at', c.created_at,
      'author', jsonb_build_object('username', cu.username,
                                   'display_name', cu.display_name,
                                   'avatar_url', cu.avatar_url)
    ) AS j
    FROM comments c
    JOIN users cu ON cu.id = c.author_id
    WHERE c.post_id = p.id
      AND c.deleted_at IS NULL
      AND c.parent_comment_id IS NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  ) top_comment ON true

  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'username', lu.username, 'avatar_url', lu.avatar_url)), '[]'::jsonb) AS j
    FROM (SELECT pl.user_id FROM post_likes pl
          WHERE pl.post_id = p.id
          ORDER BY pl.created_at DESC LIMIT 3) recent
    JOIN users lu ON lu.id = recent.user_id
  ) liked_by ON true

  LEFT JOIN post_likes vl ON vl.post_id = p.id AND vl.user_id = p_viewer_id

  -- These three terms must match idx_posts_feed's predicate term for term: a partial
  -- index is only usable when the planner can prove the query is a subset of it.
  WHERE p.deleted_at IS NULL
    AND p.status = 'active'
    AND p.visibility = 'public'
    -- Row-value comparison, not `created_at < X OR (created_at = X AND id < Y)`:
    -- logically equivalent but Postgres can satisfy this form directly from the
    -- composite (created_at, id) index, the OR form cannot.
    AND (p_cursor_created_at IS NULL
         OR (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id))
    AND (p_post_types        IS NULL OR p.post_type        = ANY(p_post_types))
    AND (p_transaction_types IS NULL OR p.transaction_type = ANY(p_transaction_types))
    AND (p_location_ids      IS NULL OR p.location_id      = ANY(p_location_ids))
    AND (p_min_price         IS NULL OR p.price_amount    >= p_min_price)
    AND (p_max_price         IS NULL OR p.price_amount    <= p_max_price)
    AND (p_min_bedrooms      IS NULL OR p.bedrooms        >= p_min_bedrooms)
    AND (p_has_media         IS NULL OR (p.media_count > 0) = p_has_media)
    AND (p_posted_after      IS NULL OR p.created_at      >= p_posted_after)
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT p_limit;
END $$;
