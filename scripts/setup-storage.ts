import { createClient } from '@supabase/supabase-js';
import { env } from '../src/config/env.js';
import { BUCKETS } from '../src/config/storage.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  const existingIds = new Set((existing ?? []).map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`Bucket "${bucket.id}" already exists — skipping.`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });
    if (error) throw error;
    console.log(`Created bucket "${bucket.id}".`);
  }

  const { data: finalList, error: finalError } = await supabase.storage.listBuckets();
  if (finalError) throw finalError;
  console.log('Buckets:', JSON.stringify(finalList, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Storage setup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
