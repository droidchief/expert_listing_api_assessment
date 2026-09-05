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

  // sql.unsafe is safe here: the input is a version-controlled file in this repo,
  // not user input, and it needs multiple statements plus a transaction block.
  await sql.unsafe(contents);

  console.log('Seed applied. Row counts:');
  for (const table of TABLES) {
    const [row] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${table}`);
    console.log(`  ${table}: ${row?.count}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
