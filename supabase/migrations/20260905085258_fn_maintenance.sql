-- recompute_post_counters: repairs the four counters that still have a real source
-- table, for one post or (when p_post_id is null) every post. Called at the end of
-- seeding and available as a manual repair if a trigger is ever bypassed.
--
-- ⚠ Never touch posts.share_count, posts.bookmark_count, or posts.view_count here.
-- Their source tables (post_shares, bookmarks, post_views) were dropped in Part 5b —
-- they are now seeded integers backing the "700 Views" / "1K Views" / bookmark counts
-- in the design. Recomputing them from a nonexistent table would silently zero them
-- and break the seed data.
CREATE OR REPLACE FUNCTION recompute_post_counters(p_post_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE posts p
  SET like_count = (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)
  WHERE p_post_id IS NULL OR p.id = p_post_id;

  UPDATE posts p
  SET comment_count = (
    SELECT count(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL
  )
  WHERE p_post_id IS NULL OR p.id = p_post_id;

  UPDATE posts p
  SET media_count = (SELECT count(*) FROM post_media m WHERE m.post_id = p.id)
  WHERE p_post_id IS NULL OR p.id = p_post_id;

  UPDATE comments c
  SET reply_count = (
    SELECT count(*) FROM comments r WHERE r.parent_comment_id = c.id AND r.deleted_at IS NULL
  )
  WHERE p_post_id IS NULL OR c.post_id = p_post_id;

  IF p_post_id IS NULL THEN
    UPDATE users u
    SET posts_count = (
      SELECT count(*) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL
    );

    UPDATE locations l
    SET post_count = (
      SELECT count(*) FROM posts p WHERE p.location_id = l.id AND p.deleted_at IS NULL
    );

    UPDATE stories s
    SET view_count = (SELECT count(*) FROM story_views sv WHERE sv.story_id = s.id);
  END IF;
END $$;
