import { z } from 'zod';

// A plain UUID-shaped regex, not z.string().uuid(): zod's strict RFC 4122 check
// rejects a version/variant nibble outside 1-8/8-b (only the literal all-zero and
// all-f UUIDs are special-cased), and this project's fixed seed/test ids
// (e.g. 20000000-0000-0000-0000-000000000001) don't comply. Same fix as MOCK_USER_ID
// in src/config/env.ts.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const likeParamsSchema = z
  .object({ id: z.string().regex(UUID_RE, 'Invalid UUID') })
  .strict();

export const likeBodySchema = z
  .object({
    action: z.enum(['like', 'unlike']).optional(),
  })
  .strict();

export type LikeParams = z.infer<typeof likeParamsSchema>;
export type LikeBody = z.infer<typeof likeBodySchema>;
