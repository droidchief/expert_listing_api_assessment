import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests hit a real Supabase Postgres instance in a different region
    // (Dublin) than most dev machines — the default 5s timeout is too tight.
    testTimeout: 20000,
    hookTimeout: 20000,
    globalSetup: ['./tests/globalSetup.ts'],
  },
});
