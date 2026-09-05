import { selectStoriesRail } from '../repositories/stories.repo.js';
import { mapStoryRailRow, type StoryRailDto } from '../mappers/story.mapper.js';

export async function getStoriesRail(viewerId: string): Promise<StoryRailDto[]> {
  const rows = await selectStoriesRail(viewerId);
  return rows.map(mapStoryRailRow);
}
