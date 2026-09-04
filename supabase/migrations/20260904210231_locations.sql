CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,140}$'),
  display_label text NOT NULL CHECK (char_length(display_label) BETWEEN 1 AND 200),
  level smallint NOT NULL CHECK (level BETWEEN 0 AND 3),
  city text,
  state text,
  country_code char(2) NOT NULL DEFAULT 'NG' CHECK (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  post_count integer NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE locations IS 'Self-referencing location hierarchy: country (level 0) -> state (1) -> city (2) -> area (3).';
COMMENT ON COLUMN locations.display_label IS 'Copied into posts.location_label by a trigger in Part 5.';
