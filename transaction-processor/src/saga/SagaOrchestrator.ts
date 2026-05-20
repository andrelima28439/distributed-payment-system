import { logger } from '../services/Logger';
import { Transaction, TransactionStatus } from '../types';
import { TransactionStateMachine } from '../state-machine/TransactionStateMachine';
import { redisService } from '../services/RedisService';

interface SagaStep {
  name: string;
  execute: (txn: Transaction) => Promise<Transaction>;
  compensate: (txn: Transaction) => Promise<Transaction>;
}

interface SagaTransaction {
  id: string;
  steps: SagaStep[];
  currentStep: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'COMPENSATING' | 'COMPENSATED' | 'FAILED';
  transaction: Transaction;
}

class SagaOrchestrator {
  private sagas: Map<string, SagaTransaction> = new Map();
  private stateMachine = TransactionStateMachine.getInstance();

  private defineSteps(): SagaStep[] {
    return [
      {
        name: 'validate',
        execute: async (txn: Transaction) => {
          if (!this.stateMachine.transition(txn.status, TransactionStatus.VALIDATING)) {
            throw new Error('Cannot transition to VALIDATING');
          }
          const updated: Transaction = { ...txn, status: TransactionStatus.VALIDATING, updatedAt: new Date().toISOString() };
          await redisService.setTransaction(updated);
          logger.info('Saga step: validate executed', { id: txn.id });
          return updated;
        },
        compensate: async (txn: Transaction) => {
          const updated: Transaction = { ...txn, status: TransactionStatus.CANCELLED, updatedAt: new Date().toISOString() };
          await redisService.setTransaction(updated);
          logger.info('Saga step: validate compensated', { id: txn.id });
          return updated;
        },
      },
      {
        name: 'fraud_check',
        execute: async (txn: Transaction) => {
          if (!this.stateMachine.transition(txn.status, TransactionStatus.FRAUD_CHECK)) {
            throw new Error('Cannot transition to FRAUD_CHECK');
          }
          const score = Math.random();
          if (score > 0.85) {
            throw new Error(`Fraud check failed with score ${score.toFixed(2)}`);
          }
          const updated: Transaction = {
            ...txn,
            status: TransactionStatus.FRAUD_CHECK,
            metadata: { ...(txn.metadata || {}), fraudScore: score },
            updatedAt: new Date().toISOString(),
          };
          await redisService.setTransaction(updated);
          logger.info('Saga step: fraud_check executed', { id: txn.id, score: score.toFixed(2) });
          return updated;
        },
        compensate: async (txn: Transaction) => {
          const updated: Transaction = { ...txn, status: TransactionStatus.DECLINED, updatedAt: new Date().toISOString() };
          await redisService.setTransaction(updated);
          logger.info('Saga step: fraud_check compensated', { id: txn.id });
          return updated;
        },
      },
      {
        name: 'process',
        execute: async (txn: Transaction) => {
          if (!this.stateMachine.transition(txn.status, TransactionStatus.PROCESSING)) {
            throw new Error('Cannot transition to PROCESSING');
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
          const updated: Transaction = {
            ...txn,
            status: TransactionStatus.APPROVED,
            metadata: {
              ...(txn.metadata || {}),
              authorizationCode: `AUTH-${txn.id.slice(0, 8).toUpperCase()}`,
            },
            updatedAt: new Date().toISOString(),
          };
          await redisService.setTransaction(updated);
          logger.info('Saga step: process executed', { id: txn.id });
          return updated;
        },
        compensate: async (txn: Transaction) => {
          const updated: Transaction = { ...txn, status: TransactionStatus.REFUNDED, updatedAt: new Date().toISOString() };
          await redisService.setTransaction(updated);
          logger.info('Saga step: process compensated (refund issued)', { id: txn.id });
          return updated;
        },
      },
      {
        name: 'notify',
        execute: async (txn: Transaction) => {
          const updated: Transaction = {
            ...txn,
            status: TransactionStatus.SETTLED,
            metadata: { ...(txn.metadata || {}), notifiedAt: new Date().toISOString() },
            updatedAt: new Date().toISOString(),
          };
          await redisService.setTransaction(updated);
          logger.info('Saga step: notify executed', { id: txn.id });
          return updated;
        },
        compensate: async (txn: Transaction) => {
          logger.warn('Saga step: notify compensated (no action needed)', { id: txn.id });
          return txn;
        },
      },
    ];
  }

  async executeSaga(transaction: Transaction): Promise<Transaction> {
    const sagaId = transaction.id;
    const steps = this.defineSteps();

    const saga: SagaTransaction = {
      id: sagaId,
      steps,
      currentStep: 0,
      status: 'IN_PROGRESS',
      transaction,
    };

    this.sagas.set(sagaId, saga);
    logger.info('Saga started', { id: sagaId, steps: steps.length });

    let currentTxn = transaction;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      saga.currentStep = i;

      try {
        logger.info('Executing saga step', { id: sagaId, step: step.name, stepNumber: i + 1 });
        currentTxn = await step.execute(currentTxn);
      } catch (err: any) {
        logger.error('Saga step failed, starting compensation', {
          id: sagaId,
          step: step.name,
          error: err.message,
        });

        saga.status = 'COMPENSATING';
        currentTxn = await this.compensate(saga, currentTxn, i);
        saga.status = 'COMPENSATED';

        this.sagas.delete(sagaId);
        throw new Error(`Saga failed at step "${step.name}": ${err.message}`);
      }
    }

    saga.status = 'COMPLETED';
    this.sagas.delete(sagaId);
    logger.info('Saga completed successfully', { id: sagaId });

    return currentTxn;
  }

  private async compensate(
    saga: SagaTransaction,
    txn: Transaction,
    failedStepIndex: number
  ): Promise<Transaction> {
    let currentTxn = txn;

    for (let i = failedStepIndex; i >= 0; i--) {
      const step = saga.steps[i];
      try {
        logger.info('Executing compensating step', { id: saga.id, step: step.name });
        currentTxn = await step.compensate(currentTxn);
      } catch (compErr: any) {
        logger.error('Compensating step failed', {
          id: saga.id,
          step: step.name,
          error: compErr.message,
        });
      }
    }

    return currentTxn;
  }

  getSagaStatus(id: string): SagaTransaction | undefined {
    return this.sagas.get(id);
  }
}

export { SagaOrchestrator, SagaStep, SagaTransaction };
