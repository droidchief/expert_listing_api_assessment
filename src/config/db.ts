import postgres from 'postgres';
import { env, isProduction } from './env.js';

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    // Supabase's Supavisor transaction pooler doesn't support prepared statements;
    // without this you get intermittent `prepared statement "s1" already exists` errors.
    prepare: false,
    transform: { undefined: null },
    onnotice: () => {},
  });

// Reuse the client across warm serverless invocations instead of opening a pool per request.
if (!isProduction) globalForDb.sql = sql;

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    await sql`SELECT 1`;
    return { ok: true, latencyMs: performance.now() - start };
  } catch (error) {
    return {
      ok: false,
      latencyMs: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
