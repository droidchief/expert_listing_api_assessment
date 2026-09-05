# Expert Listing Backend

Node.js + TypeScript + Express API for Expert Listing, a property-listing social feed
app. Backed by Supabase (Postgres) and deployed to Vercel as a serverless function.

## Stack

- Node.js 20, TypeScript (ESM, NodeNext)
- Express 5
- Supabase (Postgres) via `postgres.js` and `@supabase/supabase-js`
- Zod for validation
- Pino for logging
- Vitest + Supertest for testing
- Vercel for deployment

## Setup

```bash
npm install
cp .env.example .env   # fill in real Supabase credentials
npm run verify          # checks env + database connectivity
npm run dev
```

## Scripts

| Script      | Description                                      |
| ----------- | ------------------------------------------------- |
| `dev`       | Run the dev server with hot reload                 |
| `build`     | Compile TypeScript to `dist/`                      |
| `start`     | Run the compiled server                            |
| `verify`    | Validate env vars and check database connectivity  |
| `typecheck` | Type-check without emitting                        |
| `lint`      | Run ESLint                                         |
| `format`    | Run Prettier                                       |
| `test`      | Run the test suite                                 |
| `db:push`   | Push local migrations to the linked Supabase project |
| `db:seed`   | Run `supabase/seed.sql` via `scripts/seed.ts` |
| `db:reset`  | Reset the linked Supabase project's database        |

## Seed data

`supabase/seed.sql` is idempotent (wipe then insert) and safe to run twice via
`npm run db:seed`. Avatars (`i.pravatar.cc`) and post/story images (`picsum.photos`)
are external placeholder services, not uploaded assets — there is no storage bucket
behind them.

## Row Level Security

The five content tables the app reads (`users`, `posts`, `post_media`, `comments`,
`post_likes`) have public, read-only `SELECT` policies for `anon`/`authenticated`.
`locations`, `stories` and `story_views` have RLS enabled with zero policies
(deny-all) since nothing reads them directly via PostgREST. All writes go through the
API using the service role, which bypasses RLS, as do the five `SECURITY DEFINER`
RPCs. When real auth arrives, add owner-scoped write policies (e.g.
`auth.uid() = author_id`) alongside these read policies — there is deliberately no
`current_app_user()` helper, since without `auth.uid()` it would always return NULL.

## TODO

- Confirm the Supabase project region and update `vercel.json`'s `regions` field
  (currently `fra1`) to match, to avoid cross-region latency on every request.
