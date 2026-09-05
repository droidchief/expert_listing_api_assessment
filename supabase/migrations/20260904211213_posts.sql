CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type post_type NOT NULL DEFAULT 'general',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  transaction_type transaction_type,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  location_label text CHECK (char_length(location_label) <= 200),
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  price_amount numeric(14,2) CHECK (price_amount >= 0),
  price_currency char(3) NOT NULL DEFAULT 'NGN' CHECK (price_currency ~ '^[A-Z]{3}$'),
  price_period price_period,
  is_price_negotiable boolean NOT NULL DEFAULT false,
  bedrooms smallint CHECK (bedrooms BETWEEN 0 AND 50),
  bathrooms smallint CHECK (bathrooms BETWEEN 0 AND 50),
  parking_spaces smallint CHECK (parking_spaces BETWEEN 0 AND 100),
  property_size_sqm numeric(10,2) CHECK (property_size_sqm > 0),
  amenities text[] NOT NULL DEFAULT '{}',
  available_from date,
  inspection_at timestamptz,
  visibility post_visibility NOT NULL DEFAULT 'public',
  status content_status NOT NULL DEFAULT 'active',
  is_pinned boolean NOT NULL DEFAULT false,
  is_edited boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  share_count integer NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  bookmark_count integer NOT NULL DEFAULT 0 CHECK (bookmark_count >= 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  media_count smallint NOT NULL DEFAULT 0 CHECK (media_count >= 0),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(body, '') || ' ' || coalesce(location_label, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT chk_transaction_matches_type CHECK (
    (post_type = 'general' AND transaction_type IS NULL)
    OR
    (post_type IN ('property','request') AND transaction_type IS NOT NULL)
  ),

  CONSTRAINT chk_transaction_direction CHECK (
    transaction_type IS NULL
    OR (post_type = 'property'
          AND transaction_type IN ('for_sale','for_rent','for_shortlet'))
    OR (post_type = 'request'
          AND transaction_type IN ('looking_to_buy','looking_to_rent','looking_for_shortlet'))
  ),

  CONSTRAINT chk_coords_paired CHECK (
    (latitude IS NULL) = (longitude IS NULL)
  )
);

COMMENT ON CONSTRAINT chk_transaction_matches_type ON posts IS 'A general post carries no transaction chip; a property or request post must carry one.';
COMMENT ON CONSTRAINT chk_transaction_direction ON posts IS 'A property post may only offer (for_sale/for_rent/for_shortlet); a request post may only seek (looking_to_buy/looking_to_rent/looking_for_shortlet).';
COMMENT ON COLUMN posts.location_label IS 'Denormalised display string, populated from locations.display_label by a trigger in Part 5.';
