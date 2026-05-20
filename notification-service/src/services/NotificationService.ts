import { v4 as uuidv4 } from 'uuid';
import { Logger } from './Logger';
import { sendEmail } from '../channels/EmailChannel';
import { sendSMS } from '../channels/SMSChannel';
import { sendWebhook } from '../channels/WebhookChannel';
import {
  NotificationEvent,
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../types';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const notificationHistory: Notification[] = [];
const rateLimitMap = new Map<string, RateLimitEntry>();

function getRateLimitKey(userId: string, channel: NotificationChannel): string {
  return `${userId}:${channel}`;
}

function getRateLimitMax(channel: NotificationChannel): number {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return config.rateLimit.email;
    case NotificationChannel.SMS:
      return config.rateLimit.sms;
    case NotificationChannel.WEBHOOK:
      return config.rateLimit.webhook;
    default:
      return 10;
  }
}

function checkRateLimit(userId: string, channel: NotificationChannel): boolean {
  const key = getRateLimitKey(userId, channel);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart >= config.rateLimit.windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= getRateLimitMax(channel)) {
    Logger.warn('Rate limit exceeded', { userId, channel, count: entry.count });
    return false;
  }

  entry.count++;
  return true;
}

async function sendWithRetry(
  channel: NotificationChannel,
  to: string,
  subject: string,
  type: NotificationType,
  data: Record<string, unknown>
): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.retry.maxAttempts; attempt++) {
    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          return await sendEmail(to, subject, type, data);
        case NotificationChannel.SMS:
          return await sendSMS(to, type, data);
        case NotificationChannel.WEBHOOK:
          return await sendWebhook(to, data);
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    } catch (err) {
      lastError = err as Error;
      Logger.warn('Send attempt failed', {
        channel,
        to,
        attempt,
        maxAttempts: config.retry.maxAttempts,
        error: lastError.message,
      });

      if (attempt < config.retry.maxAttempts) {
        const delay = config.retry.baseDelayMs * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to send notification');
}

function storeNotification(notification: Notification): void {
  notificationHistory.push(notification);
  if (notificationHistory.length > 1000) {
    notificationHistory.shift();
  }
}

export class NotificationService {
  async processNotification(event: NotificationEvent): Promise<void> {
    const { payload } = event;

    Logger.info('Processing notification event', {
      notificationId: event.id,
      type: event.type,
      userId: payload.userId,
    });

    const channels = payload.preferences || [NotificationChannel.EMAIL];

    for (const channel of channels) {
      const target = this.getTargetAddress(channel, payload);
      if (!target) {
        Logger.warn('No target address for channel', { channel, userId: payload.userId });
        continue;
      }

      if (!checkRateLimit(payload.userId, channel)) {
        Logger.warn('Skipping due to rate limit', { channel, userId: payload.userId });
        this.storeFailedNotification(event, channel, target, 'Rate limit exceeded');
        continue;
      }

      try {
        const subject = this.getSubject(event.type);
        const success = await sendWithRetry(channel, target, subject, event.type, payload.data);

        if (success) {
          this.storeSentNotification(event, channel, target);
        } else {
          this.storeFailedNotification(event, channel, target, 'Send returned false');
        }
      } catch (err) {
        const error = err as Error;
        Logger.error('Notification delivery failed', {
          channel,
          notificationId: event.id,
          error: error.message,
        });
        this.storeFailedNotification(event, channel, target, error.message);
      }
    }
  }

  private getTargetAddress(
    channel: NotificationChannel,
    payload: NotificationEvent['payload']
  ): string | null {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return payload.email || null;
      case NotificationChannel.SMS:
        return payload.phone || null;
      case NotificationChannel.WEBHOOK:
        return payload.webhookUrl || null;
      default:
        return null;
    }
  }

  private getSubject(type: NotificationType): string {
    const subjects: Record<NotificationType, string> = {
      [NotificationType.TRANSACTION_APPROVED]: 'Transaction Approved',
      [NotificationType.TRANSACTION_DECLINED]: 'Transaction Declined',
      [NotificationType.CHARGEBACK]: 'Chargeback Filed',
      [NotificationType.FRAUD_DETECTED]: 'Fraud Alert - Action Required',
      [NotificationType.RECONCILIATION_DISCREPANCY]: 'Reconciliation Discrepancy Detected',
      [NotificationType.SETTLEMENT_COMPLETED]: 'Settlement Completed',
    };
    return subjects[type] || 'Notification from PayFlow';
  }

  private storeSentNotification(
    event: NotificationEvent,
    channel: NotificationChannel,
    target: string
  ): void {
    const notification: Notification = {
      id: uuidv4(),
      type: event.type,
      channel,
      to: target,
      subject: this.getSubject(event.type),
      message: `Notification sent via ${channel}`,
      status: NotificationStatus.SENT,
      createdAt: new Date().toISOString(),
      metadata: {
        eventId: event.id,
        correlationId: event.correlationId,
        userId: event.payload.userId,
      },
    };
    storeNotification(notification);
    Logger.info('Notification sent', { notificationId: notification.id, channel, to: target });
  }

  private storeFailedNotification(
    event: NotificationEvent,
    channel: NotificationChannel,
    target: string,
    reason: string
  ): void {
    const notification: Notification = {
      id: uuidv4(),
      type: event.type,
      channel,
      to: target,
      subject: this.getSubject(event.type),
      message: `Failed: ${reason}`,
      status: NotificationStatus.FAILED,
      createdAt: new Date().toISOString(),
      metadata: {
        eventId: event.id,
        correlationId: event.correlationId,
        userId: event.payload.userId,
        failureReason: reason,
      },
    };
    storeNotification(notification);
    Logger.error('Notification failed', { notificationId: notification.id, channel, reason });
  }

  getNotificationHistory(): Notification[] {
    return [...notificationHistory];
  }
}
