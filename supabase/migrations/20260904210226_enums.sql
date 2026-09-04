CREATE TYPE post_type AS ENUM ('general', 'property', 'request');

-- transaction_type validity by post_type (enforced by a CHECK constraint in Part 3):
--   property → for_sale, for_rent, for_shortlet
--   request  → looking_to_buy, looking_to_rent, looking_for_shortlet
--   general  → NULL (transaction_type does not apply)
CREATE TYPE transaction_type AS ENUM (
  'for_sale',
  'for_rent',
  'for_shortlet',
  'looking_to_buy',
  'looking_to_rent',
  'looking_for_shortlet'
);

CREATE TYPE user_role AS ENUM (
  'individual', 'broker', 'agent', 'developer', 'landlord', 'property_manager'
);

CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TYPE content_status AS ENUM ('active', 'hidden', 'removed', 'draft');

CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'private');

CREATE TYPE price_period AS ENUM ('total', 'per_annum', 'per_month', 'per_night');

CREATE TYPE share_channel AS ENUM ('copy_link', 'whatsapp', 'in_app', 'external', 'other');

CREATE TYPE view_source AS ENUM ('feed', 'profile', 'permalink', 'search', 'notification');

CREATE TYPE notification_type AS ENUM (
  'post_like', 'post_comment', 'comment_reply', 'comment_like',
  'new_follower', 'mention', 'request_match', 'story_view'
);

CREATE TYPE report_reason AS ENUM (
  'spam', 'scam_or_fraud', 'misleading_listing', 'duplicate_listing',
  'offensive', 'not_property_related', 'other'
);

CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'actioned', 'dismissed');
