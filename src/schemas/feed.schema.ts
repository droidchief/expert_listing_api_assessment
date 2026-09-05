import { z } from 'zod';
import { UUID_RE } from './shared.js';

const POST_TYPES = ['general', 'property', 'request'] as const;
const TRANSACTION_TYPES = [
  'for_sale',
  'for_rent',
  'for_shortlet',
  'looking_to_buy',
  'looking_to_rent',
  'looking_for_shortlet',
] as const;
const POSTED_WITHIN = ['24h', '7d', '30d'] as const;

// Express hands us "?post_type=property,request" as one string; split it into an
// array before validating against the enum.
const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
      z.array(z.enum(values)).nonempty(),
    )
    .optional();

const csvUuid = () =>
  z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
      z.array(z.string().regex(UUID_RE, 'Must be a valid uuid')).nonempty(),
    )
    .optional();

export const feedQuerySchema = z
  .object({
    // Lower bound is a real client error (a limit of 0 or less is nonsensical);
    // the upper bound clamps instead of rejecting — a too-generous limit is harmless
    // to cap down rather than worth failing the whole request over.
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(20)
      .transform((v) => Math.min(v, 50)),
    cursor: z.string().optional(),
    post_type: csvEnum(POST_TYPES),
    transaction_type: csvEnum(TRANSACTION_TYPES),
    location_id: csvUuid(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    min_bedrooms: z.coerce.number().int().min(0).max(50).optional(),
    has_media: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    posted_within: z.enum(POSTED_WITHIN).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.min_price !== undefined &&
      data.max_price !== undefined &&
      data.min_price > data.max_price
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['min_price'],
        message: 'min_price must not be greater than max_price',
      });
    }
  });

export type FeedQuery = z.infer<typeof feedQuerySchema>;
