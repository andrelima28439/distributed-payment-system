import amqp from 'amqplib';
import { config } from '../config';
import { logger } from '../services/Logger';

let connection: amqp.ChannelModel | null = null;
let reconnectAttempts = 0;

export async function connect(): Promise<amqp.ChannelModel> {
  while (reconnectAttempts < config.rabbitmq.maxReconnectAttempts) {
    try {
      logger.info('Connecting to RabbitMQ', { url: config.rabbitmq.url });
      connection = await amqp.connect(config.rabbitmq.url);
      reconnectAttempts = 0;

      (connection as any).on('error', (err: Error) => {
        logger.error('RabbitMQ connection error', { error: err.message });
      });

      (connection as any).on('close', async () => {
        logger.warn('RabbitMQ connection closed, reconnecting...');
        connection = null;
        await connect();
      });

      logger.info('Connected to RabbitMQ successfully');
      return connection;
    } catch (err: any) {
      reconnectAttempts++;
      logger.error('Failed to connect to RabbitMQ', {
        attempt: reconnectAttempts,
        maxAttempts: config.rabbitmq.maxReconnectAttempts,
        error: err.message,
      });

      if (reconnectAttempts >= config.rabbitmq.maxReconnectAttempts) {
        throw new Error(`Failed to connect to RabbitMQ after ${reconnectAttempts} attempts`);
      }

      await new Promise((resolve) => setTimeout(resolve, config.rabbitmq.reconnectInterval));
    }
  }

  throw new Error('Unable to establish RabbitMQ connection');
}

export async function createChannel(): Promise<amqp.Channel> {
  if (!connection) {
    connection = await connect();
  }
  const channel = await connection.createChannel();
  channel.prefetch(config.rabbitmq.prefetchCount);

  channel.on('error', (err: Error) => {
    logger.error('RabbitMQ channel error', { error: err.message });
  });

  channel.on('close', () => {
    logger.warn('RabbitMQ channel closed');
  });

  return channel;
}

export async function assertQueue(
  channel: amqp.Channel,
  queueName: string,
  options: amqp.Options.AssertQueue = {}
): Promise<amqp.Replies.AssertQueue> {
  return channel.assertQueue(queueName, {
    durable: true,
    ...options,
  });
}

export async function assertExchange(
  channel: amqp.Channel,
  exchangeName: string,
  type: string,
  options: amqp.Options.AssertExchange = {}
): Promise<amqp.Replies.AssertExchange> {
  return channel.assertExchange(exchangeName, type, {
    durable: true,
    ...options,
  });
}

export async function bindQueue(
  channel: amqp.Channel,
  queueName: string,
  exchangeName: string,
  routingKey: string
): Promise<amqp.Replies.Empty> {
  return channel.bindQueue(queueName, exchangeName, routingKey);
}

export async function close(): Promise<void> {
  try {
    if (connection) {
      await connection.close();
      connection = null;
      logger.info('RabbitMQ connection closed');
    }
  } catch (err: any) {
    logger.error('Error closing RabbitMQ connection', { error: err.message });
  }
}
