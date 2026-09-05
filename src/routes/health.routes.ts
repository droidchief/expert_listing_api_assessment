import { Router } from 'express';
import { sql, pingDb } from '../config/db.js';
import { env } from '../config/env.js';
import { ok } from '../utils/envelope.js';

const router = Router();
const startedAt = Date.now();

router.get('/health', async (req, res) => {
  const db = await pingDb();

  // mockAuth never verifies the user exists (no db lookup on the hot path), so a
  // typo'd MOCK_USER_ID would otherwise make viewer_has_liked false on every card —
  // a config error that looks exactly like a broken feature. Resolve it once here.
  let mockUser: { id: string; resolved: boolean; username?: string } = {
    id: env.MOCK_USER_ID,
    resolved: false,
  };
  if (db.ok) {
    const [row] = await sql<{ username: string }[]>`
      SELECT username FROM users WHERE id = ${env.MOCK_USER_ID}
    `;
    mockUser = row
      ? { id: env.MOCK_USER_ID, resolved: true, username: row.username }
      : { id: env.MOCK_USER_ID, resolved: false };
  }

  const body = {
    status: db.ok ? 'ok' : 'degraded',
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    version: '1.0.0',
    db: { ok: db.ok, latency_ms: Math.round(db.latencyMs) },
    mock_user: mockUser,
  };

  // String(): pino-http's own type declarations widen IncomingMessage.id (and so
  // Request.id) to ReqId (number | string | object); at runtime it's always the
  // string our requestId middleware set before pino-http ever ran.
  res.status(db.ok ? 200 : 503).json(ok(body, String(req.id)));
});

export default router;
