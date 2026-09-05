import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'listening'));

// Log only — never process.exit(). On Fluid compute that would kill a warm instance
// mid-flight for other in-progress requests.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection');
});

export default app;
