import { sql } from '../config/db.js';

export interface LocationRow {
  id: string;
  name: string;
  display_label: string;
  city: string | null;
  state: string | null;
  level: number;
  post_count: number;
}

export interface LocationQueryParams {
  q: string | null;
  parentId: string | null;
  limit: number;
}

// ILIKE with a leading wildcard can use idx_locations_search (a GIN trigram index) —
// that index exists precisely for this.
export async function selectLocations(params: LocationQueryParams): Promise<LocationRow[]> {
  return sql<LocationRow[]>`
    SELECT id, name, display_label, city, state, level, post_count
    FROM locations
    WHERE is_active
      AND (${params.q}::text IS NULL OR name ILIKE '%' || ${params.q} || '%')
      AND (${params.parentId}::uuid IS NULL OR parent_id = ${params.parentId}::uuid)
    ORDER BY post_count DESC, name ASC
    LIMIT ${params.limit}::int
  `;
}
