import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/payments',
  apiKey: process.env.API_KEY || 'sk_test_abc123def456',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
};
