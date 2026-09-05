import { z } from 'zod';
import { uuidLike } from './shared.js';

const POST_TYPES = ['general', 'property', 'request'] as const;
const PROPERTY_TRANSACTION_TYPES = ['for_sale', 'for_rent', 'for_shortlet'] as const;
const REQUEST_TRANSACTION_TYPES = [
  'looking_to_buy',
  'looking_to_rent',
  'looking_for_shortlet',
] as const;
const TRANSACTION_TYPES = [...PROPERTY_TRANSACTION_TYPES, ...REQUEST_TRANSACTION_TYPES] as const;
const PRICE_PERIODS = ['total', 'per_annum', 'per_month', 'per_night'] as const;
const MEDIA_TYPES = ['image', 'video'] as const;

const mediaItemSchema = z
  .object({
    media_type: z.enum(MEDIA_TYPES),
    storage_path: z.string().min(1),
    public_url: z.string().min(1),
    thumbnail_url: z.string().min(1).optional(),
    blurhash: z.string().optional(),
    width_px: z.coerce.number().int().positive().optional(),
    height_px: z.coerce.number().int().positive().optional(),
    duration_seconds: z.coerce.number().int().min(0).optional(),
    mime_type: z.string().optional(),
    byte_size: z.coerce.number().int().positive().optional(),
    alt_text: z.string().max(500).optional(),
    position: z.coerce.number().int().min(0).max(9).optional(),
  })
  .strict()
  // Mirrors chk_video_has_duration so the composer gets a clean, field-targeted
  // error before anything reaches Postgres.
  .superRefine((data, ctx) => {
    if (data.media_type === 'video' && data.duration_seconds === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['duration_seconds'],
        message: 'duration_seconds is required for video media.',
      });
    }
  });

export const createPostSchema = z
  .object({
    post_type: z.enum(POST_TYPES),
    body: z.string().trim().min(1).max(5000),
    transaction_type: z.enum(TRANSACTION_TYPES).optional(),
    location_id: uuidLike.optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    price_amount: z.coerce.number().min(0).optional(),
    price_currency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters')
      .default('NGN'),
    price_period: z.enum(PRICE_PERIODS).optional(),
    is_price_negotiable: z.boolean().optional(),
    bedrooms: z.coerce.number().int().min(0).max(50).optional(),
    bathrooms: z.coerce.number().int().min(0).max(50).optional(),
    parking_spaces: z.coerce.number().int().min(0).max(100).optional(),
    property_size_sqm: z.coerce.number().positive().optional(),
    amenities: z.array(z.string()).max(30).optional(),
    available_from: z.string().optional(),
    inspection_at: z.string().optional(),
    media: z.array(mediaItemSchema).max(10).optional(),
  })
  .strict()
  // Mirrors chk_transaction_matches_type and chk_transaction_direction: the CHECK
  // constraints are the guarantee that holds regardless, but zod produces
  // field_errors the composer can attach to the right form control, before
  // anything reaches Postgres. A 23514 reaching the client means this was
  // bypassed, so the CHECK is a backstop, not the primary path.
  .superRefine((data, ctx) => {
    if (data.post_type === 'general') {
      if (data.transaction_type !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['transaction_type'],
          message: 'A general post must not have a transaction_type.',
        });
      }
    } else if (data.post_type === 'property') {
      if (
        data.transaction_type === undefined ||
        !(PROPERTY_TRANSACTION_TYPES as readonly string[]).includes(data.transaction_type)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['transaction_type'],
          message: 'A property post requires for_sale, for_rent, or for_shortlet.',
        });
      }
    } else if (data.post_type === 'request') {
      if (
        data.transaction_type === undefined ||
        !(REQUEST_TRANSACTION_TYPES as readonly string[]).includes(data.transaction_type)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['transaction_type'],
          message:
            'A request post requires looking_to_buy, looking_to_rent, or looking_for_shortlet.',
        });
      }
    }

    if ((data.latitude === undefined) !== (data.longitude === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'latitude and longitude must both be present or both be absent.',
      });
    }
  });

export type CreatePostBody = z.infer<typeof createPostSchema>;
