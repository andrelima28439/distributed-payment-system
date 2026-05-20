import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';
import { logger } from './logger';
import { Webhook, WebhookEvent, WebhookPayload, Transaction } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

class WebhookService {
  private webhooks: Map<string, Webhook> = new Map();

  registerWebhook(url: string, events: WebhookEvent[]): Webhook {
    const webhook: Webhook = {
      id: uuidv4(),
      url,
      events,
      secret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date().toISOString(),
    };

    this.webhooks.set(webhook.id, webhook);
    logger.info('Webhook registered', { webhookId: webhook.id, url });

    return webhook;
  }

  listWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);

    if (deleted) {
      logger.info('Webhook deleted', { webhookId: id });
    } else {
      logger.warn('Webhook not found for deletion', { webhookId: id });
    }

    return deleted;
  }

  async sendWebhookNotification(event: WebhookEvent, transactionId: string, data: Partial<Transaction>): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values()).filter((w) =>
      w.events.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      logger.info('No webhooks to notify for event', { event });
      return;
    }

    const payload: WebhookPayload = {
      event,
      transactionId,
      data,
      timestamp: new Date().toISOString(),
    };

    for (const webhook of relevantWebhooks) {
      await this.deliverWebhookWithRetry(webhook, payload);
    }
  }

  private async deliverWebhookWithRetry(webhook: Webhook, payload: WebhookPayload, attempt: number = 1): Promise<void> {
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Webhook-Id': webhook.id,
        },
        timeout: 5000,
      });

      logger.info('Webhook delivered successfully', {
        webhookId: webhook.id,
        url: webhook.url,
        event: payload.event,
      });
    } catch (err) {
      logger.warn('Webhook delivery failed', {
        webhookId: webhook.id,
        url: webhook.url,
        attempt,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        return this.deliverWebhookWithRetry(webhook, payload, attempt + 1);
      }

      logger.error('Webhook delivery exhausted retries', {
        webhookId: webhook.id,
        url: webhook.url,
      });
    }
  }
}

export const webhookService = new WebhookService();
