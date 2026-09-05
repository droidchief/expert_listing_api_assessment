-- ══ FEED (the hot path) ═══════════════════════════════════════════════
-- Serves: GET /posts keyset pagination. The predicate below must match the
-- feed query's WHERE clause TERM FOR TERM or the planner will ignore it.
CREATE INDEX idx_posts_feed
  ON posts (created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND status = 'active' AND visibility = 'public';

-- Serves: GET /posts with post_type / transaction_type / location filters
CREATE INDEX idx_posts_filter
  ON posts (post_type, transaction_type, location_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND status = 'active';

-- Serves: profile tab, a user's own posts
CREATE INDEX idx_posts_author
  ON posts (author_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Serves: price-range filter
CREATE INDEX idx_posts_price
  ON posts (price_amount)
  WHERE deleted_at IS NULL AND price_amount IS NOT NULL;

-- Serves: bedroom filter
CREATE INDEX idx_posts_bedrooms
  ON posts (bedrooms)
  WHERE deleted_at IS NULL AND bedrooms IS NOT NULL;

-- Serves: amenity filter, array containment (amenities @> ARRAY[...])
CREATE INDEX idx_posts_amenities ON posts USING gin (amenities);

-- Serves: full-text search (?q= param)
CREATE INDEX idx_posts_search ON posts USING gin (search_vector);

-- ══ MEDIA ═════════════════════════════════════════════════════════════
-- Serves: the LATERAL media join in get_feed, already ordered
CREATE INDEX idx_post_media_post ON post_media (post_id, position);

-- ══ COMMENTS ══════════════════════════════════════════════════════════
-- Serves: GET /posts/:id/comments — root comments, newest first, keyset
CREATE INDEX idx_comments_post
  ON comments (post_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND parent_comment_id IS NULL;

-- Serves: loading a whole thread by root
CREATE INDEX idx_comments_thread
  ON comments (root_comment_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- ══ ENGAGEMENT ════════════════════════════════════════════════════════
-- Serves: "which posts has this user liked" (reverse of the composite PK)
CREATE INDEX idx_post_likes_user ON post_likes (user_id, post_id);

-- Serves: the "Liked by miracle.h and 7 others" facepile
CREATE INDEX idx_post_likes_recent ON post_likes (post_id, created_at DESC);

-- Serves: viewer_has_liked on comments
CREATE INDEX idx_comment_likes_user ON comment_likes (user_id, comment_id);

-- Serves: the saved-posts tab
CREATE INDEX idx_bookmarks_user ON bookmarks (user_id, created_at DESC);

-- ══ STORIES ═══════════════════════════════════════════════════════════
CREATE INDEX idx_stories_live
  ON stories (author_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX idx_stories_expiry ON stories (expires_at);

-- Serves: the seen/unseen ring
CREATE INDEX idx_story_views_viewer ON story_views (viewer_id, story_id);

-- ══ SOCIAL ════════════════════════════════════════════════════════════
-- Serves: "who follows X" (reverse of the composite PK)
CREATE INDEX idx_follows_followee ON follows (followee_id, created_at DESC);

-- ══ LOCATIONS ═════════════════════════════════════════════════════════
-- Serves: GET /locations?q= typeahead (trigram similarity)
CREATE INDEX idx_locations_search ON locations USING gin (name gin_trgm_ops);

CREATE INDEX idx_locations_parent ON locations (parent_id, level);

-- ══ AUXILIARY ═════════════════════════════════════════════════════════
-- Serves: the unread notification badge
CREATE INDEX idx_notifications_unread
  ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

-- Serves: the moderation queue
CREATE INDEX idx_reports_open
  ON reports (status, created_at DESC)
  WHERE status IN ('open', 'reviewing');

ANALYZE;
