import http from 'http';
import { config } from './config';
import { logger } from './services/Logger';
import { connect, createChannel, close as closeRabbitMQ } from './queue/connection';
import { setupQueueTopology } from './queue/setup';
import { startValidationWorker } from './workers/ValidationWorker';
import { startFraudCheckWorker } from './workers/FraudCheckWorker';
import { startProcessingWorker } from './workers/ProcessingWorker';
import { startSettlementWorker } from './workers/SettlementWorker';
import { redisService } from './services/RedisService';

let channel: any = null;
let server: http.Server | null = null;

async function healthCheck(): Promise<Record<string, any>> {
  const redisConnected = await redisService.isConnected();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisConnected ? 'connected' : 'disconnected',
      rabbitmq: channel ? 'connected' : 'disconnected',
    },
  };
}

function startHealthServer(): void {
  server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const health = await healthCheck();
      const statusCode = health.services.redis === 'connected' && health.services.rabbitmq === 'connected' ? 200 : 503;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(config.port, () => {
    logger.info(`Health check server listening on port ${config.port}`);
  });
}

async function shutdown(): Promise<void> {
  logger.info('Initiating graceful shutdown...');

  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    logger.info('HTTP server closed');
  }

  try {
    await closeRabbitMQ();
  } catch (err: any) {
    logger.error('Error closing RabbitMQ', { error: err.message });
  }

  try {
    await redisService.quit();
  } catch (err: any) {
    logger.error('Error closing Redis', { error: err.message });
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { error: reason?.message || reason });
});
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  shutdown();
});

async function main(): Promise<void> {
  logger.info('Starting Transaction Processor Service');

  try {
    await connect();
    channel = await createChannel();

    await setupQueueTopology(channel);
    await startValidationWorker(channel);
    await startFraudCheckWorker(channel);
    await startProcessingWorker(channel);
    await startSettlementWorker(channel);

    startHealthServer();

    logger.info('Transaction Processor Service started successfully', {
      rabbitmq: config.rabbitmq.url,
      redis: config.redis.url,
      port: config.port,
    });
  } catch (err: any) {
    logger.error('Failed to start Transaction Processor Service', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

main();
