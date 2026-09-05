import { z } from 'zod';
import { uuidLike } from './shared.js';

export const locationQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(60).optional(),
    parent_id: uuidLike.optional(),
    // Same asymmetric handling as the feed: reject below 1, silently clamp above 50.
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(20)
      .transform((v) => Math.min(v, 50)),
  })
  .strict();

export type LocationQuery = z.infer<typeof locationQuerySchema>;
