import { ROLE_LABELS } from '../config/constants.js';
import type { MeRow } from '../repositories/users.repo.js';

export interface MeDto {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_blurhash: string | null;
  bio: string | null;
  role: string | null;
  role_label: string | null;
  is_verified: boolean;
  is_business: boolean;
  company_name: string | null;
  location: { city: string | null; state: string | null; country_code: string };
  default_location: { id: string; label: string } | null;
  counts: { posts: number };
}

export function mapMeRow(row: MeRow): MeDto {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    avatar_blurhash: row.avatar_blurhash,
    bio: row.bio,
    role: row.role,
    role_label: row.role ? ROLE_LABELS[row.role]! : null,
    is_verified: row.is_verified,
    is_business: row.is_business,
    company_name: row.company_name,
    location: { city: row.city, state: row.state, country_code: row.country_code },
    default_location:
      row.default_location_id && row.default_location_label
        ? { id: row.default_location_id, label: row.default_location_label }
        : null,
    counts: { posts: row.posts_count },
  };
}
