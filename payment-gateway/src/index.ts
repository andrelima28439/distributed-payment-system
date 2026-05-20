import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { rateLimiter } from './middleware/rateLimiter';
import { idempotencyMiddleware } from './middleware/idempotency';
import { logger } from './services/logger';
import transactionRoutes from './routes/transactions';
import webhookRoutes from './routes/webhooks';
import tokenRoutes from './routes/tokens';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);
app.use(idempotencyMiddleware);

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(transactionRoutes);
app.use(webhookRoutes);
app.use(tokenRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

const server = app.listen(config.port, () => {
  logger.info(`Payment gateway listening on port ${config.port}`);
});

function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
