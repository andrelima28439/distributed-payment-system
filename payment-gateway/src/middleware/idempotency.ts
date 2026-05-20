import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../services/logger';

const redis = new Redis(config.redisUrl);

const IDEMPOTENCY_TTL = 86400;

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'PUT') {
    next();
    return;
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    next();
    return;
  }

  try {
    const cached = await redis.get(`idempotency:${idempotencyKey}`);

    if (cached) {
      const cachedResponse = JSON.parse(cached);
      logger.info(`Idempotency hit for key ${idempotencyKey}`);
      res.status(cachedResponse.status).json(cachedResponse.body);
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const responseData = {
        status: res.statusCode,
        body,
      };

      redis
        .setex(`idempotency:${idempotencyKey}`, IDEMPOTENCY_TTL, JSON.stringify(responseData))
        .catch((err) => logger.error('Failed to cache idempotency response', err));

      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error('Idempotency middleware error', err);
    next();
  }
}
