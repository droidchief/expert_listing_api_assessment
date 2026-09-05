import pino from 'pino';
import { env, isProduction } from '../config/env.js';

const SENSITIVE_KEY = /key|password/i;
const MAX_DEPTH = 6;

// pino's built-in `redact` option only matches fixed/glob paths, not "any key
// containing this substring at any depth" — which is what *key*/*password* means
// here. This walks the log object recursively to catch those wherever they appear.
function redactSensitiveKeys(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveKeys(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactSensitiveKeys(val, depth + 1);
  }
  return result;
}

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-user-id"]'],
    censor: '[redacted]',
  },
  formatters: {
    log: (object) => redactSensitiveKeys(object) as Record<string, unknown>,
  },
  // Pretty output locally; raw JSON in production so Vercel's log drain can parse it.
  transport: isProduction ? undefined : { target: 'pino-pretty' },
});
