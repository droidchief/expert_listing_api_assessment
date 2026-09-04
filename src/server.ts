// Replaced in Part 8 by createApp() from src/app.ts
import { createServer } from 'node:http';
import { env } from './config/env.js';

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'placeholder', part: 1 }));
});

server.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
