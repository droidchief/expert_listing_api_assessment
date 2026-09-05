import { sql } from '../config/db.js';

export interface StoryRailRow {
  author_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_business: boolean;
  story_count: number;
  has_unseen: boolean;
  preview_url: string | null;
  latest_at: string;
}

export async function selectStoriesRail(viewerId: string): Promise<StoryRailRow[]> {
  return sql<StoryRailRow[]>`
    SELECT u.id AS author_id, u.username, u.display_name, u.avatar_url,
           u.is_verified, u.is_business,
           count(*)::int AS story_count,
           bool_or(sv.viewer_id IS NULL) AS has_unseen,
           (array_agg(COALESCE(s.thumbnail_url, s.public_url)
                      ORDER BY s.created_at DESC))[1] AS preview_url,
           (to_json(max(s.created_at)) #>> '{}') AS latest_at
    FROM stories s
    JOIN users u ON u.id = s.author_id AND u.deleted_at IS NULL
    LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = ${viewerId}::uuid
    WHERE s.status = 'active' AND s.expires_at > now()
    GROUP BY u.id
    ORDER BY has_unseen DESC, latest_at DESC
  `;
}
