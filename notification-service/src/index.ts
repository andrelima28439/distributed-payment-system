import http from 'http';
import { config } from './config';
import { Logger } from './services/Logger';
import { connect, close } from './queue/connection';
import { startConsumers } from './queue/consumer';

let server: http.Server;

async function startHealthServer(): Promise<void> {
  server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise<void>((resolve) => {
    server.listen(config.port, () => {
      Logger.info('Health check server started', { port: config.port });
      resolve();
    });
  });
}

async function shutdown(): Promise<void> {
  Logger.info('Shutting down gracefully...');

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    Logger.info('HTTP server closed');
  }

  await close();
  Logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  Logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown();
});

async function main(): Promise<void> {
  try {
    Logger.info('Starting notification service...');

    await connect();
    await startHealthServer();
    startConsumers();

    Logger.info('Notification service started successfully', { port: config.port });
  } catch (err) {
    const error = err as Error;
    Logger.error('Failed to start notification service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();
