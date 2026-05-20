import { Channel, ConsumeMessage } from 'amqplib';
import { QUEUES, EXCHANGES } from '../queue/setup';
import { logger } from '../services/Logger';
import { redisService } from '../services/RedisService';
import { QueueMessage, Transaction, TransactionStatus, WorkerResult } from '../types';
import { TransactionStateMachine } from '../state-machine/TransactionStateMachine';
import { config } from '../config';
import axios from 'axios';

const stateMachine = TransactionStateMachine.getInstance();

async function processSettlement(transaction: Transaction): Promise<{ settled: boolean; settlementId: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

  try {
    const response = await axios.post(`${config.services.reconciliation}/settle`, {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      merchantId: transaction.merchantId,
      authorizationCode: transaction.metadata?.authorizationCode,
    });

    return {
      settled: true,
      settlementId: response.data.settlementId || `STL-${transaction.id.slice(0, 8).toUpperCase()}`,
    };
  } catch (err: any) {
    logger.warn('Reconciliation service unavailable, simulating settlement', {
      transactionId: transaction.id,
      error: err.message,
    });

    return {
      settled: true,
      settlementId: `STL-${transaction.id.slice(0, 8).toUpperCase()}`,
    };
  }
}

export async function startSettlementWorker(channel: Channel): Promise<void> {
  logger.info('Starting SettlementWorker');

  await channel.consume(
    QUEUES.SETTLEMENT.name,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const startTime = Date.now();
      let result: WorkerResult;

      try {
        const message: QueueMessage = JSON.parse(msg.content.toString());
        logger.info('SettlementWorker received message', { transactionId: message.data.id });

        const settlementResult = await processSettlement(message.data);

        if (settlementResult.settled) {
          if (!stateMachine.transition(message.data.status, TransactionStatus.CAPTURED)) {
            throw new Error(`Invalid state transition from ${message.data.status} to CAPTURED`);
          }

          const settledTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.SETTLED,
            metadata: {
              ...(message.data.metadata || {}),
              settlementId: settlementResult.settlementId,
              settledAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(settledTransaction);

          try {
            await axios.post(`${config.services.notification}/notify`, {
              transactionId: settledTransaction.id,
              status: 'SETTLED',
              amount: settledTransaction.amount,
              currency: settledTransaction.currency,
              customerEmail: settledTransaction.customerEmail,
              settlementId: settlementResult.settlementId,
            });
          } catch (notifyErr: any) {
            logger.warn('Failed to send settlement notification', {
              transactionId: message.data.id,
              error: notifyErr.message,
            });
          }

          result = {
            success: true,
            transactionId: message.data.id,
            status: TransactionStatus.SETTLED,
            message: 'Transaction settled successfully',
            data: { settlementId: settlementResult.settlementId },
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Transaction settled successfully', {
            transactionId: message.data.id,
            settlementId: settlementResult.settlementId,
          });
        } else {
          const failedTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.FAILED,
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(failedTransaction);

          result = {
            success: false,
            transactionId: message.data.id,
            status: TransactionStatus.FAILED,
            message: 'Settlement failed',
            processingTimeMs: Date.now() - startTime,
          };

          const retryMessage: QueueMessage = {
            ...message,
            retryCount: (message.retryCount || 0) + 1,
            timestamp: new Date().toISOString(),
          };

          if ((message.retryCount || 0) < 3) {
            channel.publish(
              EXCHANGES.MAIN.name,
              QUEUES.SETTLEMENT.routingKey,
              Buffer.from(JSON.stringify(retryMessage)),
              { persistent: true }
            );
          } else {
            channel.publish(
              EXCHANGES.DLX.name,
              QUEUES.SETTLEMENT_DLQ.routingKey,
              Buffer.from(JSON.stringify(message)),
              { persistent: true }
            );
            logger.error('Settlement failed, moved to DLQ', { transactionId: message.data.id });
          }

          channel.ack(msg);
        }
      } catch (err: any) {
        logger.error('SettlementWorker error', { error: err.message });

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

  logger.info('SettlementWorker started');
}
