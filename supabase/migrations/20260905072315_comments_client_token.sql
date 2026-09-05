ALTER TABLE comments
  ADD COLUMN client_token text
  CHECK (client_token IS NULL OR char_length(client_token) BETWEEN 8 AND 64);

-- Partial unique index (allowed exception): resolves a double-submit race inside
-- Postgres rather than in application code — the second insert conflicts and the
-- API returns the original comment.
CREATE UNIQUE INDEX uq_comments_client_token
  ON comments (author_id, client_token)
  WHERE client_token IS NOT NULL;
