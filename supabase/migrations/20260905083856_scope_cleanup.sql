-- Scope reduction: drops the twelve tables that render in the design but back no
-- required interaction (follow graph, comment/post likes-of-likes, bookmarks, shares,
-- views, notifications, reports, blocks, saved filters, hashtags, mentions). The
-- brief only requires like/comment/filter plus the composer; everything else here
-- just needs to display a seeded number. Surviving 8: users, locations, posts,
-- post_media, comments, post_likes, stories, story_views.

DROP TABLE IF EXISTS post_hashtags;
DROP TABLE IF EXISTS hashtags;
DROP TABLE IF EXISTS mentions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS saved_filters;
DROP TABLE IF EXISTS comment_likes;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS post_shares;
DROP TABLE IF EXISTS post_views;
DROP TABLE IF EXISTS follows;

-- DROP TABLE removes each table's triggers with it, but leaves the trigger
-- functions behind since they're standalone objects.
DROP FUNCTION IF EXISTS trgfn_comment_like_count();
DROP FUNCTION IF EXISTS trgfn_post_bookmark_count();
DROP FUNCTION IF EXISTS trgfn_post_share_count();
DROP FUNCTION IF EXISTS trgfn_post_view_count();
DROP FUNCTION IF EXISTS trgfn_follow_counts();
DROP FUNCTION IF EXISTS trgfn_hashtag_usage_count();

-- Enums that were only ever referenced by the dropped tables.
DROP TYPE IF EXISTS share_channel;
DROP TYPE IF EXISTS view_source;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS report_reason;
DROP TYPE IF EXISTS report_status;
