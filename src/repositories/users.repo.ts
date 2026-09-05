import { sql } from '../config/db.js';

export interface MeRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_blurhash: string | null;
  bio: string | null;
  role: string | null;
  is_verified: boolean;
  is_business: boolean;
  company_name: string | null;
  city: string | null;
  state: string | null;
  country_code: string;
  posts_count: number;
  default_location_id: string | null;
  default_location_label: string | null;
}

export async function selectMe(userId: string): Promise<MeRow | null> {
  const [row] = await sql<[MeRow?]>`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.avatar_blurhash,
           u.bio, u.role, u.is_verified, u.is_business, u.company_name,
           u.city, u.state, u.country_code,
           u.posts_count, u.default_location_id,
           l.display_label AS default_location_label
    FROM users u
    LEFT JOIN locations l ON l.id = u.default_location_id
    WHERE u.id = ${userId}::uuid AND u.deleted_at IS NULL
  `;
  return row ?? null;
}
