import { z } from 'zod';

// A plain UUID-shaped regex, not z.string().uuid(): zod's strict RFC 4122 check
// rejects a version/variant nibble outside 1-8/8-b (only the literal all-zero and
// all-f UUIDs are special-cased), and this project's fixed seed/test ids
// (e.g. 20000000-0000-0000-0000-000000000001) don't comply. Same fix as MOCK_USER_ID
// in src/config/env.ts — this has bitten three times now, so it lives here once.
export const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuidLike = z.string().regex(UUID_RE, 'Must be a valid uuid');
