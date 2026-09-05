export interface BucketSpec {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export const BUCKETS: BucketSpec[] = [
  {
    id: 'post-media',
    public: true,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'],
  },
  {
    id: 'avatars',
    public: true,
    fileSizeLimit: 2097152,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'story-media',
    public: true,
    fileSizeLimit: 10485760,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
  },
];

export const BUCKET_MAP: Record<string, BucketSpec> = Object.fromEntries(
  BUCKETS.map((b) => [b.id, b]),
);

export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};
