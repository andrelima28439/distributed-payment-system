import amqp from 'amqplib';
import { config } from '../config';
import { Logger } from '../services/Logger';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;
let retryCount = 0;

export async function connect(): Promise<void> {
  while (retryCount < config.rabbitmq.maxRetries) {
    try {
      Logger.info('Connecting to RabbitMQ', { url: config.rabbitmq.url, attempt: retryCount + 1 });
      connection = await amqp.connect(config.rabbitmq.url);
      channel = await connection.createChannel();

      channel.on('error', (err) => {
        Logger.error('RabbitMQ channel error', { error: err.message });
      });

      channel.on('close', () => {
        Logger.warn('RabbitMQ channel closed');
      });

      (connection as any).on('error', (err: Error) => {
        Logger.error('RabbitMQ connection error', { error: err.message });
      });

      (connection as any).on('close', async () => {
        Logger.warn('RabbitMQ connection closed, reconnecting...');
        channel = null;
        connection = null;
        await connect();
      });

      await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      await channel.assertQueue(config.rabbitmq.queue, { durable: true });
      await channel.bindQueue(config.rabbitmq.queue, config.rabbitmq.exchange, config.rabbitmq.routingKey);
      await channel.prefetch(config.rabbitmq.prefetch);

      retryCount = 0;
      Logger.info('Connected to RabbitMQ successfully');
      return;
    } catch (err) {
      retryCount++;
      const error = err as Error;
      Logger.error('Failed to connect to RabbitMQ', {
        attempt: retryCount,
        maxRetries: config.rabbitmq.maxRetries,
        error: error.message,
      });

      if (retryCount >= config.rabbitmq.maxRetries) {
        throw new Error(`Failed to connect to RabbitMQ after ${config.rabbitmq.maxRetries} attempts`);
      }

      await new Promise((resolve) => setTimeout(resolve, config.rabbitmq.retryInterval));
    }
  }
}

export function getChannel(): amqp.Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export async function close(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    Logger.info('RabbitMQ connection closed');
  } catch (err) {
    const error = err as Error;
    Logger.error('Error closing RabbitMQ connection', { error: error.message });
  }
}
