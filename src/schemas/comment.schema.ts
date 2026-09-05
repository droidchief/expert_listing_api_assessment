import { z } from 'zod';
import { uuidLike } from './shared.js';

export const commentParamsSchema = z.object({ id: uuidLike }).strict();

export const commentQuerySchema = z
  .object({
    // Same asymmetric handling as the feed: reject below 1, silently clamp above 50.
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(20)
      .transform((v) => Math.min(v, 50)),
    cursor: z.string().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict();

export const createCommentSchema = z
  .object({
    // Trimmed first so the value that reaches the database is what the
    // char_length(btrim(body)) CHECK constraint also sees.
    body: z.string().trim().min(1).max(2000),
    parent_comment_id: uuidLike.optional(),
    client_token: z.string().min(8).max(64).optional(),
  })
  .strict();

export type CommentParams = z.infer<typeof commentParamsSchema>;
export type CommentQuery = z.infer<typeof commentQuerySchema>;
export type CreateCommentBody = z.infer<typeof createCommentSchema>;
