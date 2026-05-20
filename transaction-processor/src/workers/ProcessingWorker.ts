import { Channel, ConsumeMessage } from 'amqplib';
import { QUEUES, EXCHANGES } from '../queue/setup';
import { logger } from '../services/Logger';
import { redisService } from '../services/RedisService';
import { QueueMessage, Transaction, TransactionStatus, WorkerResult } from '../types';
import { TransactionStateMachine } from '../state-machine/TransactionStateMachine';
import { config } from '../config';
import axios from 'axios';

const stateMachine = TransactionStateMachine.getInstance();
let requestCount = 0;
let lastResetTime = Date.now();

function checkThrottle(): boolean {
  const now = Date.now();
  if (now - lastResetTime >= 1000) {
    requestCount = 0;
    lastResetTime = now;
  }
  requestCount++;
  return requestCount <= config.throttling.maxRequestsPerSecond;
}

async function simulateAcquirerCommunication(transaction: Transaction): Promise<{ approved: boolean; authorizationCode: string }> {
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

  const approved = Math.random() > 0.15;
  return {
    approved,
    authorizationCode: approved ? `AUTH-${transaction.id.slice(0, 8).toUpperCase()}` : '',
  };
}

export async function startProcessingWorker(channel: Channel): Promise<void> {
  logger.info('Starting ProcessingWorker');

  await channel.consume(
    QUEUES.PROCESSING.name,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const startTime = Date.now();
      let result: WorkerResult;

      try {
        const message: QueueMessage = JSON.parse(msg.content.toString());
        logger.info('ProcessingWorker received message', { transactionId: message.data.id });

        if (!checkThrottle()) {
          logger.warn('Throttling active, rejecting message', { transactionId: message.data.id });
          channel.nack(msg, false, true);
          setTimeout(() => {}, 100);
          return;
        }

        const acquirerResult = await simulateAcquirerCommunication(message.data);

        if (acquirerResult.approved) {
          if (!stateMachine.transition(message.data.status, TransactionStatus.PROCESSING)) {
            throw new Error(`Invalid state transition from ${message.data.status} to PROCESSING`);
          }

          const approvedTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.APPROVED,
            metadata: {
              ...(message.data.metadata || {}),
              authorizationCode: acquirerResult.authorizationCode,
              processedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(approvedTransaction);

          const nextMessage: QueueMessage = {
            pattern: 'payment.settlement',
            data: approvedTransaction,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString(),
          };

          channel.publish(
            EXCHANGES.MAIN.name,
            QUEUES.SETTLEMENT.routingKey,
            Buffer.from(JSON.stringify(nextMessage)),
            { persistent: true }
          );

          try {
            await axios.post(`${config.services.notification}/notify`, {
              transactionId: approvedTransaction.id,
              status: 'APPROVED',
              amount: approvedTransaction.amount,
              currency: approvedTransaction.currency,
              customerEmail: approvedTransaction.customerEmail,
              authorizationCode: acquirerResult.authorizationCode,
            });
          } catch (notifyErr: any) {
            logger.warn('Failed to send notification', { transactionId: message.data.id, error: notifyErr.message });
          }

          result = {
            success: true,
            transactionId: message.data.id,
            status: TransactionStatus.APPROVED,
            message: 'Payment approved',
            data: { authorizationCode: acquirerResult.authorizationCode },
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Payment approved', { transactionId: message.data.id, authCode: acquirerResult.authorizationCode });
        } else {
          const declinedTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.DECLINED,
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(declinedTransaction);

          try {
            await axios.post(`${config.services.notification}/notify`, {
              transactionId: declinedTransaction.id,
              status: 'DECLINED',
              amount: declinedTransaction.amount,
              currency: declinedTransaction.currency,
              customerEmail: declinedTransaction.customerEmail,
            });
          } catch (notifyErr: any) {
            logger.warn('Failed to send notification', { transactionId: message.data.id, error: notifyErr.message });
          }

          result = {
            success: false,
            transactionId: message.data.id,
            status: TransactionStatus.DECLINED,
            message: 'Payment declined by acquirer',
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Payment declined', { transactionId: message.data.id });
        }
      } catch (err: any) {
        logger.error('ProcessingWorker error', { error: err.message });

        result = {
          success: false,
          transactionId: 'unknown',
          status: TransactionStatus.FAILED,
          message: `Unexpected error: ${err.message}`,
          error: err.message,
          processingTimeMs: Date.now() - startTime,
        };

        channel.nack(msg, false, true);
      }
    },
    { noAck: false }
  );

  logger.info('ProcessingWorker started');
}
