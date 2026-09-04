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
| `db:seed`   | Run `supabase/seed.sql` against the direct database URL |
| `db:reset`  | Reset the linked Supabase project's database        |

## TODO

- Confirm the Supabase project region and update `vercel.json`'s `regions` field
  (currently `fra1`) to match, to avoid cross-region latency on every request.
