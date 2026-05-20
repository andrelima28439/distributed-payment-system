import { Channel } from 'amqplib';
import { logger } from '../services/Logger';
import { assertExchange, assertQueue, bindQueue } from './connection';

const EXCHANGES = {
  MAIN: { name: 'payments.topic', type: 'topic' },
  DLX: { name: 'payments.dlx', type: 'direct' },
} as const;

const QUEUES = {
  VALIDATION: {
    name: 'payment.validation',
    routingKey: 'payment.validation',
    options: { durable: true },
  },
  FRAUD_CHECK: {
    name: 'payment.fraud_check',
    routingKey: 'payment.fraud_check',
    options: { durable: true },
  },
  PROCESSING: {
    name: 'payment.processing',
    routingKey: 'payment.processing',
    options: { durable: true },
  },
  SETTLEMENT: {
    name: 'payment.settlement',
    routingKey: 'payment.settlement',
    options: { durable: true },
  },
  VALIDATION_DLQ: {
    name: 'payment.validation.dlq',
    routingKey: 'payment.validation.dlq',
    options: { durable: true },
  },
  PROCESSING_DLQ: {
    name: 'payment.processing.dlq',
    routingKey: 'payment.processing.dlq',
    options: { durable: true },
  },
  SETTLEMENT_DLQ: {
    name: 'payment.settlement.dlq',
    routingKey: 'payment.settlement.dlq',
    options: { durable: true },
  },
  FRAUD_CHECK_DLQ: {
    name: 'payment.fraud_check.dlq',
    routingKey: 'payment.fraud_check.dlq',
    options: { durable: true },
  },
  PRIORITY: {
    name: 'payment.priority',
    routingKey: 'payment.priority',
    options: { durable: true, arguments: { 'x-max-priority': 10 } },
  },
  DELAYED: {
    name: 'payment.delayed',
    routingKey: 'payment.delayed',
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'payments.topic',
        'x-dead-letter-routing-key': 'payment.validation',
        'x-message-ttl': 30000,
      },
    },
  },
} as const;

export async function setupQueueTopology(channel: Channel): Promise<void> {
  logger.info('Setting up RabbitMQ queue topology');

  for (const exchange of Object.values(EXCHANGES)) {
    await assertExchange(channel, exchange.name, exchange.type);
    logger.info('Exchange declared', { exchange: exchange.name, type: exchange.type });
  }

  for (const queue of Object.values(QUEUES)) {
    await assertQueue(channel, queue.name, queue.options);
    logger.info('Queue declared', { queue: queue.name });
  }

  const bindings = [
    { queue: QUEUES.VALIDATION.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.VALIDATION.routingKey },
    { queue: QUEUES.FRAUD_CHECK.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.FRAUD_CHECK.routingKey },
    { queue: QUEUES.PROCESSING.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.PROCESSING.routingKey },
    { queue: QUEUES.SETTLEMENT.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.SETTLEMENT.routingKey },
    { queue: QUEUES.PRIORITY.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.PRIORITY.routingKey },
    { queue: QUEUES.DELAYED.name, exchange: EXCHANGES.MAIN.name, key: QUEUES.DELAYED.routingKey },
    { queue: QUEUES.VALIDATION_DLQ.name, exchange: EXCHANGES.DLX.name, key: QUEUES.VALIDATION_DLQ.routingKey },
    { queue: QUEUES.PROCESSING_DLQ.name, exchange: EXCHANGES.DLX.name, key: QUEUES.PROCESSING_DLQ.routingKey },
    { queue: QUEUES.SETTLEMENT_DLQ.name, exchange: EXCHANGES.DLX.name, key: QUEUES.SETTLEMENT_DLQ.routingKey },
    { queue: QUEUES.FRAUD_CHECK_DLQ.name, exchange: EXCHANGES.DLX.name, key: QUEUES.FRAUD_CHECK_DLQ.routingKey },
  ];

  for (const binding of bindings) {
    await bindQueue(channel, binding.queue, binding.exchange, binding.key);
    logger.info('Queue bound', { queue: binding.queue, exchange: binding.exchange, key: binding.key });
  }

  logger.info('RabbitMQ queue topology setup complete');
}

export { EXCHANGES, QUEUES };
