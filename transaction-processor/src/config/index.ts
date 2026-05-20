import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
    reconnectInterval: parseInt(process.env.RABBITMQ_RECONNECT_INTERVAL || '5000', 10),
    maxReconnectAttempts: parseInt(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS || '10', 10),
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH || '10', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379',
    keyPrefix: 'txn:',
    ttl: parseInt(process.env.REDIS_TTL || '86400', 10),
  },
  services: {
    fraudDetection: process.env.FRAUD_DETECTION_URL || 'http://fraud-detection:8000',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
    reconciliation: process.env.RECONCILIATION_SERVICE_URL || 'http://reconciliation-service:8080',
  },
  throttling: {
    maxRequestsPerSecond: parseInt(process.env.MAX_REQ_PER_SEC || '10', 10),
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
    recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '30000', 10),
  },
};
