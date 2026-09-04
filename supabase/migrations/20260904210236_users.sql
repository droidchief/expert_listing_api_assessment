CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username citext NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]{3,30}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  avatar_url text,
  avatar_blurhash text,
  bio text CHECK (char_length(bio) <= 300),
  role user_role,
  is_verified boolean NOT NULL DEFAULT false,
  is_business boolean NOT NULL DEFAULT false,
  company_name text CHECK (char_length(company_name) <= 120),
  phone_e164 text CHECK (phone_e164 ~ '^\+[1-9]\d{7,14}$'),
  whatsapp_e164 text CHECK (whatsapp_e164 ~ '^\+[1-9]\d{7,14}$'),
  email citext UNIQUE,
  default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  city text,
  state text DEFAULT 'Lagos',
  country_code char(2) NOT NULL DEFAULT 'NG' CHECK (country_code ~ '^[A-Z]{2}$'),
  posts_count integer NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  followers_count integer NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count integer NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE users IS 'Public profile table; mirrors auth.users when real auth is enabled. auth_user_id is nullable so mock users work without an auth.users row.';
COMMENT ON COLUMN users.is_business IS 'Drives the business badge on story avatars, distinct from is_verified.';
