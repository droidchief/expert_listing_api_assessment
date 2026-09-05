import { createRequire } from 'node:module';
import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { mockAuth } from './middleware/mockAuth.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// helmet ships dual ESM/CJS type declarations whose conditional-exports resolution
// is inconsistent across TypeScript's moduleResolution modes — it type-checks fine
// as a plain `import helmet from 'helmet'` locally but fails as "not callable" under
// Vercel's build. Loading it via the real CJS require and asserting its known shape
// sidesteps the ambiguity entirely rather than depending on which resolution mode a
// given build environment happens to pick.
const require = createRequire(import.meta.url);
const helmet = require('helmet') as typeof import('helmet').default;

export function createApp(): Express {
  const app = express();

  // Vercel puts every request behind its own proxy; without this express-rate-limit
  // reads req.ip as the proxy's address (every client collapses into one IP bucket)
  // and, depending on version, refuses to start over the ambiguity.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',') }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, customProps: (req) => ({ request_id: String(req.id) }) }));
  app.use(mockAuth);
  app.use(rateLimiter);

  app.use('/api/v1', routes);

  app.use(notFound);
  // Express 5 forwards rejected async handlers to error middleware automatically —
  // no express-async-errors, no asyncHandler wrapper needed.
  app.use(errorHandler);

  return app;
}

// Vercel's zero-config Express detection can pick this file as the serverless entry
// instead of server.ts, and its Node.js runtime requires that entry's default export
// to be a callable function or server. An Express app is itself a valid request
// handler, so this satisfies that path without calling listen() here — server.ts
// still owns the actual local/production listener and its own default export.
export default createApp();
