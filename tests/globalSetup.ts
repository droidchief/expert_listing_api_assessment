import 'dotenv/config';
import postgres from 'postgres';

// Runs once after every test file in the run has finished. Per-file afterAll hooks
// clean up their own [TEST]/test.* fixture rows; this is the backstop that catches a
// leak across the whole suite before it can degrade the seed data the demo video
// depends on.
export default async function globalTeardownSetup() {
  return async () => {
    const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
    try {
      const [{ count: userCount }] = await sql<[{ count: number }]>`
        SELECT count(*)::int AS count FROM users WHERE username LIKE 'test.%'
      `;
      const [{ count: postCount }] = await sql<[{ count: number }]>`
        SELECT count(*)::int AS count FROM posts WHERE body LIKE '[TEST]%'
      `;
      if (userCount > 0 || postCount > 0) {
        throw new Error(
          `Test debris left behind: ${userCount} test.* user(s), ${postCount} [TEST]* post(s)`,
        );
      }
    } finally {
      await sql.end();
    }
  };
}
