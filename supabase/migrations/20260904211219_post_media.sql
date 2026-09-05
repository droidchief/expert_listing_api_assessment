CREATE TABLE post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type media_type NOT NULL DEFAULT 'image',
  storage_bucket text NOT NULL DEFAULT 'post-media',
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  thumbnail_url text,
  blurhash text,
  width_px integer CHECK (width_px > 0),
  height_px integer CHECK (height_px > 0),
  -- Null-guarded: both dimensions are nullable and height could be 0, which would
  -- otherwise raise a division error inside the generated column expression.
  aspect_ratio numeric(6,4) GENERATED ALWAYS AS (
    CASE WHEN width_px IS NOT NULL AND height_px IS NOT NULL AND height_px > 0
         THEN round(width_px::numeric / height_px::numeric, 4)
    END
  ) STORED,
  duration_seconds integer CHECK (duration_seconds >= 0),
  mime_type text,
  byte_size bigint CHECK (byte_size > 0),
  alt_text text CHECK (char_length(alt_text) <= 500),
  position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 9),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_post_media_position UNIQUE (post_id, position),

  CONSTRAINT chk_video_has_duration CHECK (
    media_type <> 'video' OR duration_seconds IS NOT NULL
  )
);
