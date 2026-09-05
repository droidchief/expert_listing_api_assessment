import type { StoryRailRow } from '../repositories/stories.repo.js';

export interface StoryRailDto {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_business: boolean;
  };
  story_count: number;
  has_unseen: boolean;
  preview_url: string | null;
  latest_at: string;
}

export function mapStoryRailRow(row: StoryRailRow): StoryRailDto {
  return {
    author: {
      id: row.author_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      is_verified: row.is_verified,
      is_business: row.is_business,
    },
    story_count: row.story_count,
    has_unseen: row.has_unseen,
    preview_url: row.preview_url,
    latest_at: row.latest_at,
  };
}
