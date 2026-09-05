import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sql } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');

const TABLES = [
  'users',
  'locations',
  'posts',
  'post_media',
  'comments',
  'post_likes',
  'stories',
  'story_views',
] as const;

async function main() {
  const contents = readFileSync(seedPath, 'utf8');

  // The seed file is one BEGIN...COMMIT script, so every statement in it must run on
  // the same physical connection. sql.unsafe on the shared pooled client (max: 3)
  // can't guarantee that, so it refuses the whole thing outright. A reserved
  // connection is dedicated to us until released, making the transaction safe.
  // sql.unsafe is otherwise safe here: the input is a version-controlled file in
  // this repo, not user input.
  const reserved = await sql.reserve();
  try {
    await reserved.unsafe(contents);

    console.log('Seed applied. Row counts:');
    for (const table of TABLES) {
      const [row] = await reserved.unsafe(`SELECT count(*)::int AS count FROM ${table}`);
      console.log(`  ${table}: ${row?.count}`);
    }
  } finally {
    await reserved.release();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
