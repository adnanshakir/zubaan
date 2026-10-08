import http from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

import { logger } from './utils/logger.js';

let server: http.Server | undefined;
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

async function startServer(): Promise<void> {
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

startServer().catch((error: unknown) => {
  logger.error('Server startup failed', error);
  process.exitCode = 1;
});
