import { getChannel } from './connection';
import { config } from '../config';
import { Logger } from '../services/Logger';
import { NotificationEvent, NotificationType, NotificationChannel } from '../types';
import { NotificationService } from '../services/NotificationService';

export function startConsumers(): void {
  const channel = getChannel();
  const notificationService = new NotificationService();

  channel.consume(
    config.rabbitmq.queue,
    async (msg) => {
      if (!msg) return;

      const correlationId = msg.properties.correlationId || 'unknown';

      try {
        const content = msg.content.toString();
        Logger.info('Received message', { correlationId, routingKey: msg.fields.routingKey });

        const event: NotificationEvent = JSON.parse(content);

        await notificationService.processNotification(event);

        channel.ack(msg);
        Logger.info('Message processed successfully', {
          correlationId,
          notificationId: event.id,
          type: event.type,
        });
      } catch (err) {
        const error = err as Error;
        Logger.error('Failed to process message', {
          correlationId,
          error: error.message,
          deliveryTag: msg.fields.deliveryTag,
        });

        const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;
        if (retryCount < config.retry.maxAttempts) {
          const headers = { ...msg.properties.headers, 'x-retry-count': retryCount + 1 };
          channel.publish(
            config.rabbitmq.exchange,
            msg.fields.routingKey,
            msg.content,
            { headers, persistent: true }
          );
          Logger.info('Message requeued for retry', {
            correlationId,
            retryCount: retryCount + 1,
          });
        } else {
          Logger.error('Message exhausted retries, sending to DLQ', {
            correlationId,
            retryCount,
          });
          channel.publish(
            config.rabbitmq.exchange,
            'notification.dlq',
            msg.content,
            { persistent: true }
          );
        }

        channel.ack(msg);
      }
    },
    { noAck: false }
  );

  Logger.info('Consumer started', { queue: config.rabbitmq.queue });

  const notificationTypes = Object.values(NotificationType);
  const channels = Object.values(NotificationChannel);
  Logger.info('Available notification types', { types: notificationTypes });
  Logger.info('Available channels', { channels });
}
