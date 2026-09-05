import { randomUUID } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { BUCKET_MAP, MIME_EXTENSIONS } from '../config/storage.js';
import { AppError } from '../errors/AppError.js';
import type { SignUploadBody } from '../schemas/upload.schema.js';

export interface SignUploadResult {
  bucket: string;
  path: string;
  token: string;
  signed_url: string;
  public_url: string;
}

function buildPath(bucket: string, userId: string, ext: string): string {
  const id = randomUUID();
  switch (bucket) {
    case 'post-media':
      return `posts/${randomUUID()}/${id}.${ext}`;
    case 'avatars':
      return `avatars/${userId}/${id}.${ext}`;
    case 'story-media':
      return `stories/${userId}/${id}.${ext}`;
    default:
      // Unreachable: zod already restricts bucket to the three known values.
      throw new AppError(400, 'VALIDATION_ERROR', 'Unknown bucket.', false);
  }
}

export async function signUpload(
  body: SignUploadBody,
  userId: string,
): Promise<SignUploadResult> {
  const spec = BUCKET_MAP[body.bucket];
  if (!spec) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unknown bucket.', false);
  }

  if (!spec.allowedMimeTypes.includes(body.content_type)) {
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      `${body.content_type} is not allowed for bucket "${body.bucket}".`,
      false,
    );
  }

  if (body.byte_size !== undefined && body.byte_size > spec.fileSizeLimit) {
    throw new AppError(
      413,
      'PAYLOAD_TOO_LARGE',
      `That file exceeds the ${spec.fileSizeLimit} byte limit for bucket "${body.bucket}".`,
      false,
    );
  }

  // Path is always server-generated — never accept a client-supplied path, since a
  // client that controls the path can overwrite another user's object. Extension is
  // derived from content_type, not a client-supplied filename, for the same reason.
  const ext = MIME_EXTENSIONS[body.content_type] ?? 'bin';
  const path = buildPath(body.bucket, userId, ext);

  const { data, error } = await supabase.storage.from(body.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Could not create an upload URL.', true);
  }

  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${body.bucket}/${path}`;

  return {
    bucket: body.bucket,
    path,
    token: data.token,
    signed_url: data.signedUrl,
    public_url: publicUrl,
  };
}
