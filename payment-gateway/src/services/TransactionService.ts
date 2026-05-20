import { v4 as uuidv4 } from 'uuid';
import amqplib from 'amqplib';
import { config } from '../config';
import { logger } from './logger';
import { Transaction, TransactionStatus, TransactionRequest, WebhookEvent } from '../types';
import { webhookService } from './WebhookService';

const QUEUE = 'transactions';

class TransactionService {
  private transactions: Map<string, Transaction> = new Map();

  async createTransaction(request: TransactionRequest): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      status: TransactionStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      maskedCardNumber: request.maskedCardNumber || `****${request.cardNumber?.slice(-4)}`,
      description: request.description,
      metadata: request.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const connection = await amqplib.connect(config.rabbitmqUrl);
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE, { durable: true });
      channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(transaction)), {
        persistent: true,
      });
      await channel.close();
      await connection.close();
    } catch (err) {
      logger.error('Failed to send transaction to queue', { transactionId: transaction.id, error: err });
      transaction.status = TransactionStatus.FAILED;
      transaction.updatedAt = new Date().toISOString();
      this.transactions.set(transaction.id, transaction);
      throw new Error('Failed to process transaction');
    }

    this.transactions.set(transaction.id, transaction);
    logger.info('Transaction created', { transactionId: transaction.id, amount: transaction.amount });

    webhookService.sendWebhookNotification(WebhookEvent.TRANSACTION_CREATED, transaction.id, transaction);

    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);

    if (!transaction) {
      logger.warn('Transaction not found', { transactionId: id });
      return null;
    }

    logger.info('Transaction retrieved', { transactionId: id });
    return transaction;
  }

  async captureTransaction(id: string): Promise<Transaction> {
    const transaction = this.transactions.get(id);

    if (!transaction) {
      logger.error('Transaction not found for capture', { transactionId: id });
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.AUTHORIZED) {
      logger.error('Cannot capture non-authorized transaction', { transactionId: id, status: transaction.status });
      throw new Error(`Cannot capture transaction with status ${transaction.status}`);
    }

    transaction.status = TransactionStatus.CAPTURED;
    transaction.updatedAt = new Date().toISOString();
    this.transactions.set(id, transaction);

    logger.info('Transaction captured', { transactionId: id });
    webhookService.sendWebhookNotification(WebhookEvent.TRANSACTION_CAPTURED, id, transaction);

    return transaction;
  }

  async cancelTransaction(id: string): Promise<Transaction> {
    const transaction = this.transactions.get(id);

    if (!transaction) {
      logger.error('Transaction not found for cancel', { transactionId: id });
      throw new Error('Transaction not found');
    }

    if (transaction.status === TransactionStatus.CAPTURED || transaction.status === TransactionStatus.REFUNDED) {
      logger.error('Cannot cancel transaction', { transactionId: id, status: transaction.status });
      throw new Error(`Cannot cancel transaction with status ${transaction.status}`);
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.updatedAt = new Date().toISOString();
    this.transactions.set(id, transaction);

    logger.info('Transaction cancelled', { transactionId: id });
    webhookService.sendWebhookNotification(WebhookEvent.TRANSACTION_CANCELLED, id, transaction);

    return transaction;
  }

  async refundTransaction(id: string): Promise<Transaction> {
    const transaction = this.transactions.get(id);

    if (!transaction) {
      logger.error('Transaction not found for refund', { transactionId: id });
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.CAPTURED) {
      logger.error('Cannot refund non-captured transaction', { transactionId: id, status: transaction.status });
      throw new Error(`Cannot refund transaction with status ${transaction.status}`);
    }

    transaction.status = TransactionStatus.REFUNDED;
    transaction.updatedAt = new Date().toISOString();
    this.transactions.set(id, transaction);

    logger.info('Transaction refunded', { transactionId: id });
    webhookService.sendWebhookNotification(WebhookEvent.TRANSACTION_REFUNDED, id, transaction);

    return transaction;
  }

  simulateAuthorization(id: string): void {
    const transaction = this.transactions.get(id);
    if (transaction && transaction.status === TransactionStatus.PENDING) {
      transaction.status = TransactionStatus.AUTHORIZED;
      transaction.updatedAt = new Date().toISOString();
      this.transactions.set(id, transaction);
      logger.info('Transaction authorized (simulated)', { transactionId: id });
    }
  }
}

export const transactionService = new TransactionService();
