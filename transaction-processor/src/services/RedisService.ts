import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './Logger';
import { Transaction } from '../types';

class RedisService {
  private client: Redis;
  private connected: boolean = false;

  constructor() {
    this.client = new Redis(config.redis.url, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn('Redis reconnecting', { attempt: times, delay });
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
      logger.info('Connected to Redis');
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err.message });
    });

    this.client.on('close', () => {
      this.connected = false;
      logger.warn('Redis connection closed');
    });
  }

  async setTransaction(transaction: Transaction): Promise<void> {
    const key = `${config.redis.keyPrefix}${transaction.id}`;
    await this.client.set(key, JSON.stringify(transaction), 'EX', config.redis.ttl);
    logger.debug('Transaction stored in Redis', { id: transaction.id, status: transaction.status });
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const key = `${config.redis.keyPrefix}${id}`;
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as Transaction;
  }

  async updateTransactionStatus(id: string, status: string): Promise<void> {
    const key = `${config.redis.keyPrefix}${id}`;
    const data = await this.client.get(key);
    if (data) {
      const txn = JSON.parse(data) as Transaction;
      txn.status = status as any;
      txn.updatedAt = new Date().toISOString();
      await this.client.set(key, JSON.stringify(txn), 'EX', config.redis.ttl);
    }
    logger.debug('Transaction status updated in Redis', { id, status });
  }

  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return current <= maxRequests;
  }

  async cacheFraudResult(transactionId: string, result: object, ttl: number = 3600): Promise<void> {
    const key = `fraud:${transactionId}`;
    await this.client.set(key, JSON.stringify(result), 'EX', ttl);
  }

  async getFraudResult(transactionId: string): Promise<object | null> {
    const key = `fraud:${transactionId}`;
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as object;
  }

  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis connection closed');
    } catch (err: any) {
      logger.error('Error closing Redis connection', { error: err.message });
    }
  }
}

export const redisService = new RedisService();
