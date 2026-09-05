-- ══ set_updated_at ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON saved_filters FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══ simple counter triggers ══════════════════════════════════════════
-- UPDATE ... SET c = c + 1 is atomic per row — no read-modify-write race.
-- RETURN NULL is correct for an AFTER trigger (its return value is ignored).

CREATE OR REPLACE FUNCTION trgfn_post_like_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_like_count AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_like_count();

CREATE OR REPLACE FUNCTION trgfn_comment_like_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_comment_like_count AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION trgfn_comment_like_count();

CREATE OR REPLACE FUNCTION trgfn_post_bookmark_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET bookmark_count = bookmark_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_bookmark_count AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_bookmark_count();

CREATE OR REPLACE FUNCTION trgfn_post_share_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_share_count AFTER INSERT ON post_shares
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_share_count();

CREATE OR REPLACE FUNCTION trgfn_post_view_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_view_count AFTER INSERT ON post_views
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_view_count();

CREATE OR REPLACE FUNCTION trgfn_post_media_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET media_count = media_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET media_count = media_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_media_count AFTER INSERT OR DELETE ON post_media
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_media_count();

CREATE OR REPLACE FUNCTION trgfn_story_view_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_story_view_count AFTER INSERT ON story_views
  FOR EACH ROW EXECUTE FUNCTION trgfn_story_view_count();

CREATE OR REPLACE FUNCTION trgfn_hashtag_usage_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
  ELSE
    UPDATE hashtags SET usage_count = usage_count - 1 WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_hashtag_usage_count AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION trgfn_hashtag_usage_count();

CREATE OR REPLACE FUNCTION trgfn_follow_counts() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.followee_id;
  ELSE
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.followee_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_follow_counts AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trgfn_follow_counts();

-- ══ soft-delete-aware counter triggers ═══════════════════════════════
-- Hard-deleting a post cascades to comments and post_media, whose AFTER DELETE
-- triggers then try to UPDATE posts for a row being removed in the same
-- statement. That UPDATE simply affects zero rows — harmless and expected,
-- no guard needed.

CREATE OR REPLACE FUNCTION trgfn_post_comment_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_post_comment_count
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION trgfn_post_comment_count();

CREATE OR REPLACE FUNCTION trgfn_comment_reply_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL AND NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.parent_comment_id IS NOT NULL THEN
      IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE comments SET reply_count = reply_count - 1 WHERE id = NEW.parent_comment_id;
      ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL AND OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_comment_reply_count
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION trgfn_comment_reply_count();

CREATE OR REPLACE FUNCTION trgfn_user_post_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE users SET posts_count = posts_count - 1 WHERE id = NEW.author_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE users SET posts_count = posts_count - 1 WHERE id = OLD.author_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_user_post_count
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION trgfn_user_post_count();

CREATE OR REPLACE FUNCTION trgfn_location_post_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL AND NEW.location_id IS NOT NULL THEN
      UPDATE locations SET post_count = post_count + 1 WHERE id = NEW.location_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.location_id IS NOT NULL THEN
      IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE locations SET post_count = post_count - 1 WHERE id = NEW.location_id;
      ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE locations SET post_count = post_count + 1 WHERE id = NEW.location_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL AND OLD.location_id IS NOT NULL THEN
      UPDATE locations SET post_count = post_count - 1 WHERE id = OLD.location_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_location_post_count
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION trgfn_location_post_count();

-- ══ validation and derivation triggers ═══════════════════════════════
-- Multiple BEFORE triggers on one table fire in alphabetical order by
-- trigger name. On posts: trg_content_edited, then trg_denormalise_location,
-- then trg_set_updated_at. On comments: trg_comment_guard fires alone on
-- INSERT; on UPDATE, trg_content_edited fires before trg_set_updated_at.
-- None of these depend on another's output, so the order is safe but is
-- pinned here deliberately rather than left to chance.

-- Closes the nesting hole a CHECK constraint cannot reach: depth is capped
-- at 1 by chk_depth_consistent, but nothing stops a depth=1 comment from
-- pointing at a parent that is itself depth=1. This trigger rejects that.
CREATE OR REPLACE FUNCTION trgfn_comment_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent RECORD;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    NEW.depth := 0;
    NEW.root_comment_id := NEW.id;
  ELSE
    SELECT id, depth, post_id, root_comment_id, deleted_at
      INTO parent FROM comments WHERE id = NEW.parent_comment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent comment not found'
        USING ERRCODE = '23503';
    END IF;

    IF parent.post_id <> NEW.post_id THEN
      RAISE EXCEPTION 'parent comment belongs to a different post'
        USING ERRCODE = '23514';
    END IF;

    IF parent.depth >= 1 THEN
      RAISE EXCEPTION 'maximum reply depth is one level'
        USING ERRCODE = '23514';
    END IF;

    NEW.depth := 1;
    NEW.root_comment_id := COALESCE(parent.root_comment_id, parent.id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_comment_guard BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION trgfn_comment_guard();

CREATE OR REPLACE FUNCTION trgfn_content_edited() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.is_edited := true;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_content_edited BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trgfn_content_edited();
CREATE TRIGGER trg_content_edited BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION trgfn_content_edited();

CREATE OR REPLACE FUNCTION trgfn_denormalise_location() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location_id IS NOT NULL AND NEW.location_label IS NULL THEN
    SELECT display_label INTO NEW.location_label FROM locations WHERE id = NEW.location_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_denormalise_location BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trgfn_denormalise_location();
