import { selectLocations } from '../repositories/locations.repo.js';
import type { LocationQuery } from '../schemas/location.schema.js';

export async function listLocations(query: LocationQuery) {
  return selectLocations({
    q: query.q ?? null,
    parentId: query.parent_id ?? null,
    limit: query.limit,
  });
}
