import { Channel, ConsumeMessage } from 'amqplib';
import { QUEUES, EXCHANGES } from '../queue/setup';
import { logger } from '../services/Logger';
import { redisService } from '../services/RedisService';
import { QueueMessage, Transaction, TransactionStatus, WorkerResult } from '../types';
import { TransactionStateMachine } from '../state-machine/TransactionStateMachine';
import { v4 as uuidv4 } from 'uuid';

const stateMachine = TransactionStateMachine.getInstance();

function isValidCardNumber(cardNumber: string): boolean {
  return /^\d{16}$/.test(cardNumber);
}

function isValidExpiry(expiry: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expYear = 2000 + year;
  const expMonth = month - 1;
  const expDate = new Date(expYear, expMonth + 1, 0);
  return expDate >= new Date();
}

function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 && Number.isFinite(amount);
}

function isValidMerchant(merchantId: string): boolean {
  return Boolean(merchantId && merchantId.length >= 3 && merchantId.length <= 50);
}

export async function startValidationWorker(channel: Channel): Promise<void> {
  logger.info('Starting ValidationWorker');

  await channel.consume(
    QUEUES.VALIDATION.name,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const startTime = Date.now();
      let result: WorkerResult;

      try {
        const message: QueueMessage = JSON.parse(msg.content.toString());
        logger.info('ValidationWorker received message', { transactionId: message.data.id });

        let validationPassed = true;
        const errors: string[] = [];

        if (!isValidCardNumber(message.data.cardNumber)) {
          errors.push('Invalid card number');
          validationPassed = false;
        }

        if (!isValidExpiry(message.data.cardExpiry)) {
          errors.push('Invalid card expiry');
          validationPassed = false;
        }

        if (!isValidAmount(message.data.amount)) {
          errors.push('Invalid amount');
          validationPassed = false;
        }

        if (!isValidMerchant(message.data.merchantId)) {
          errors.push('Invalid merchant');
          validationPassed = false;
        }

        if (validationPassed) {
          if (!stateMachine.transition(message.data.status, TransactionStatus.VALIDATING)) {
            throw new Error(`Invalid state transition from ${message.data.status} to VALIDATING`);
          }

          const updatedTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.FRAUD_CHECK,
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(updatedTransaction);

          const nextMessage: QueueMessage = {
            pattern: 'payment.fraud_check',
            data: updatedTransaction,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString(),
          };

          channel.publish(
            EXCHANGES.MAIN.name,
            QUEUES.FRAUD_CHECK.routingKey,
            Buffer.from(JSON.stringify(nextMessage)),
            { persistent: true }
          );

          result = {
            success: true,
            transactionId: message.data.id,
            status: TransactionStatus.FRAUD_CHECK,
            message: 'Validation passed',
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Validation passed, forwarded to fraud check', { transactionId: message.data.id });
        } else {
          if (!stateMachine.transition(message.data.status, TransactionStatus.FAILED)) {
            logger.warn('Could not transition to FAILED', { status: message.data.status });
          }

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
            message: `Validation failed: ${errors.join(', ')}`,
            error: errors.join(', '),
            processingTimeMs: Date.now() - startTime,
          };

          const retryCount = message.retryCount || 0;
          if (retryCount < 3) {
            const retryMessage: QueueMessage = {
              ...message,
              retryCount: retryCount + 1,
              timestamp: new Date().toISOString(),
            };

            channel.publish(
              EXCHANGES.MAIN.name,
              QUEUES.VALIDATION.routingKey,
              Buffer.from(JSON.stringify(retryMessage)),
              { persistent: true }
            );

            channel.ack(msg);
            logger.warn('Validation failed, retrying', { transactionId: message.data.id, retryCount: retryCount + 1 });
          } else {
            channel.publish(
              EXCHANGES.DLX.name,
              QUEUES.VALIDATION_DLQ.routingKey,
              Buffer.from(JSON.stringify(message)),
              { persistent: true }
            );

            channel.ack(msg);
            logger.error('Validation failed, moved to DLQ', { transactionId: message.data.id, errors: errors.join(', ') });
          }
        }

        redisService.setTransaction({
          ...message.data,
          status: TransactionStatus.FAILED,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (err: any) {
        logger.error('ValidationWorker error', { error: err.message });

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

  logger.info('ValidationWorker started');
}
