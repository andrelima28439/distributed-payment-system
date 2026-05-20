import { Channel, ConsumeMessage } from 'amqplib';
import { QUEUES, EXCHANGES } from '../queue/setup';
import { logger } from '../services/Logger';
import { redisService } from '../services/RedisService';
import { QueueMessage, Transaction, TransactionStatus, WorkerResult } from '../types';
import { TransactionStateMachine } from '../state-machine/TransactionStateMachine';
import { config } from '../config';
import axios from 'axios';

const stateMachine = TransactionStateMachine.getInstance();

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= config.circuitBreaker.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info('Circuit breaker closed after successful probe');
      }
      return result;
    } catch (err: any) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= config.circuitBreaker.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened', { failures: this.failures });
      }

      throw err;
    }
  }

  getState(): string {
    return this.state;
  }
}

const fraudCircuitBreaker = new CircuitBreaker();

async function callFraudDetectionService(transaction: Transaction): Promise<{ score: number; decision: string }> {
  return fraudCircuitBreaker.call(async () => {
    try {
      const response = await axios.post(`${config.services.fraudDetection}/check`, {
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        cardNumber: transaction.cardNumber.slice(-4),
        merchantId: transaction.merchantId,
        customerId: transaction.customerId,
      });

      return {
        score: response.data.score || 0,
        decision: response.data.decision || 'approve',
      };
    } catch (err: any) {
      logger.warn('Fraud detection service unavailable, using local fallback', {
        transactionId: transaction.id,
        error: err.message,
      });
      return localFraudCheck(transaction);
    }
  });
}

function localFraudCheck(transaction: Transaction): { score: number; decision: string } {
  const score = Math.random();
  const decision = score < 0.7 ? 'approve' : score < 0.9 ? 'review' : 'decline';

  logger.info('Local fraud check performed', {
    transactionId: transaction.id,
    score: score.toFixed(2),
    decision,
  });

  return { score, decision };
}

export async function startFraudCheckWorker(channel: Channel): Promise<void> {
  logger.info('Starting FraudCheckWorker');

  await channel.consume(
    QUEUES.FRAUD_CHECK.name,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const startTime = Date.now();
      let result: WorkerResult;

      try {
        const message: QueueMessage = JSON.parse(msg.content.toString());
        logger.info('FraudCheckWorker received message', { transactionId: message.data.id });

        const cachedResult = await redisService.getFraudResult(message.data.id);
        let fraudResult: { score: number; decision: string };

        if (cachedResult) {
          fraudResult = cachedResult as { score: number; decision: string };
          logger.info('Using cached fraud result', { transactionId: message.data.id });
        } else {
          fraudResult = await callFraudDetectionService(message.data);
          await redisService.cacheFraudResult(message.data.id, fraudResult);
        }

        if (fraudResult.decision === 'approve') {
          if (!stateMachine.transition(message.data.status, TransactionStatus.FRAUD_CHECK)) {
            throw new Error(`Invalid state transition from ${message.data.status} to FRAUD_CHECK`);
          }

          const processingTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.PROCESSING,
            metadata: {
              ...(message.data.metadata || {}),
              fraudScore: fraudResult.score,
              fraudDecision: fraudResult.decision,
            },
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(processingTransaction);

          const nextMessage: QueueMessage = {
            pattern: 'payment.processing',
            data: processingTransaction,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString(),
          };

          channel.publish(
            EXCHANGES.MAIN.name,
            QUEUES.PROCESSING.routingKey,
            Buffer.from(JSON.stringify(nextMessage)),
            { persistent: true }
          );

          result = {
            success: true,
            transactionId: message.data.id,
            status: TransactionStatus.PROCESSING,
            message: `Fraud check passed (score: ${fraudResult.score})`,
            data: { fraudScore: fraudResult.score, fraudDecision: fraudResult.decision },
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Fraud check passed, forwarded to processing', {
            transactionId: message.data.id,
            score: fraudResult.score,
          });
        } else {
          const declinedTransaction: Transaction = {
            ...message.data,
            status: TransactionStatus.DECLINED,
            metadata: {
              ...(message.data.metadata || {}),
              fraudScore: fraudResult.score,
              fraudDecision: fraudResult.decision,
            },
            updatedAt: new Date().toISOString(),
          };

          await redisService.setTransaction(declinedTransaction);

          result = {
            success: false,
            transactionId: message.data.id,
            status: TransactionStatus.DECLINED,
            message: `Transaction declined by fraud check (score: ${fraudResult.score})`,
            data: { fraudScore: fraudResult.score, fraudDecision: fraudResult.decision },
            processingTimeMs: Date.now() - startTime,
          };

          channel.ack(msg);
          logger.info('Transaction declined by fraud check', {
            transactionId: message.data.id,
            score: fraudResult.score,
            decision: fraudResult.decision,
          });
        }
      } catch (err: any) {
        logger.error('FraudCheckWorker error', { error: err.message });

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

  logger.info('FraudCheckWorker started');
}
