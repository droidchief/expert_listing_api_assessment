-- Model: read-only public access to the five content tables that render in the
-- Flutter app, via anon/authenticated SELECT policies. Every write goes through the
-- API using the service role, which bypasses RLS entirely, as do the five
-- SECURITY DEFINER RPCs. locations, stories and story_views get RLS enabled with zero
-- policies (deny-all) since nothing reads them directly via PostgREST.
--
-- No current_app_user() helper: there is no signed-in identity in this build
-- (auth.uid() would always be NULL), so an owner-based policy referencing it would be
-- dead code. When real auth arrives, add owner-scoped INSERT/UPDATE/DELETE policies
-- keyed on auth.uid() = author_id (or equivalent) alongside these SELECT policies.

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_public ON users
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY posts_select_public ON posts
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND status = 'active' AND visibility = 'public');

CREATE POLICY post_media_select_public ON post_media
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
        AND p.deleted_at IS NULL AND p.status = 'active' AND p.visibility = 'public'
    )
  );

CREATE POLICY comments_select_public ON comments
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND status = 'active');

CREATE POLICY post_likes_select_public ON post_likes
  FOR SELECT TO anon, authenticated
  USING (true);
