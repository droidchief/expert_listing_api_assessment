import { z } from 'zod';
import { uuidLike } from './shared.js';

export const likeParamsSchema = z.object({ id: uuidLike }).strict();

export const likeBodySchema = z
  .object({
    action: z.enum(['like', 'unlike']).optional(),
  })
  .strict();

export type LikeParams = z.infer<typeof likeParamsSchema>;
export type LikeBody = z.infer<typeof likeBodySchema>;
