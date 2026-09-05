import { z } from 'zod';

export const signUploadSchema = z
  .object({
    bucket: z.enum(['post-media', 'avatars', 'story-media']),
    content_type: z.string().min(1),
    byte_size: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SignUploadBody = z.infer<typeof signUploadSchema>;
