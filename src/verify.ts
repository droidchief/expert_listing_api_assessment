import { env, redactedEnv } from './config/env.js';
import { pingDb, sql } from './config/db.js';

async function main() {
  console.log('Environment configuration:');
  console.table(redactedEnv());

  const ping = await pingDb();
  if (!ping.ok) {
    console.error(`Database ping failed after ${ping.latencyMs.toFixed(1)}ms: ${ping.error}`);
    process.exit(1);
  }
  console.log(`Database ping ok (${ping.latencyMs.toFixed(1)}ms)`);

  try {
    const [row] = await sql<{ version: string }[]>`SELECT version();`;
    console.log(`Postgres version: ${row?.version}`);
  } catch (error) {
    console.error('Failed to query Postgres version:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log(`Verified successfully for NODE_ENV=${env.NODE_ENV}`);
  process.exit(0);
}

main();
