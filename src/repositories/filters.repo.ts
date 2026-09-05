import { sql } from '../config/db.js';

export interface TopLocationRow {
  id: string;
  label: string;
  post_count: number;
}

export async function selectTopLocations(): Promise<TopLocationRow[]> {
  return sql<TopLocationRow[]>`
    SELECT id, display_label AS label, post_count
    FROM locations
    WHERE is_active AND post_count > 0
    ORDER BY post_count DESC
    LIMIT 20
  `;
}

export async function selectMaxPrice(): Promise<number | null> {
  const [row] = await sql<[{ max: string | null }]>`
    SELECT max(price_amount) AS max FROM posts WHERE deleted_at IS NULL
  `;
  return row.max === null ? null : Number(row.max);
}
