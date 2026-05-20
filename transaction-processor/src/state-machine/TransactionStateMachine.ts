import { EventEmitter } from 'events';
import { TransactionStatus } from '../types';
import { logger } from '../services/Logger';

interface Transition {
  from: TransactionStatus[];
  to: TransactionStatus;
}

class TransactionStateMachine extends EventEmitter {
  private static instance: TransactionStateMachine;

  private readonly transitions: Transition[] = [
    { from: [TransactionStatus.PENDING], to: TransactionStatus.VALIDATING },
    { from: [TransactionStatus.VALIDATING], to: TransactionStatus.FRAUD_CHECK },
    { from: [TransactionStatus.VALIDATING], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.FRAUD_CHECK], to: TransactionStatus.PROCESSING },
    { from: [TransactionStatus.FRAUD_CHECK], to: TransactionStatus.DECLINED },
    { from: [TransactionStatus.FRAUD_CHECK], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.PROCESSING], to: TransactionStatus.APPROVED },
    { from: [TransactionStatus.PROCESSING], to: TransactionStatus.DECLINED },
    { from: [TransactionStatus.PROCESSING], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.APPROVED], to: TransactionStatus.CAPTURED },
    { from: [TransactionStatus.APPROVED], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.CAPTURED], to: TransactionStatus.SETTLED },
    { from: [TransactionStatus.CAPTURED], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.PENDING], to: TransactionStatus.CANCELLED },
    { from: [TransactionStatus.APPROVED], to: TransactionStatus.REFUNDED },
    { from: [TransactionStatus.CAPTURED], to: TransactionStatus.REFUNDED },
    { from: [TransactionStatus.SETTLED], to: TransactionStatus.REFUNDED },
    { from: [TransactionStatus.FAILED], to: TransactionStatus.REFUNDED },
    { from: [TransactionStatus.DECLINED], to: TransactionStatus.REFUNDED },
    { from: [TransactionStatus.FAILED], to: TransactionStatus.FAILED },
    { from: [TransactionStatus.PENDING], to: TransactionStatus.FAILED },
  ];

  private constructor() {
    super();
  }

  static getInstance(): TransactionStateMachine {
    if (!TransactionStateMachine.instance) {
      TransactionStateMachine.instance = new TransactionStateMachine();
    }
    return TransactionStateMachine.instance;
  }

  isValidTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    return this.transitions.some(
      (t) => t.from.includes(from) && t.to === to
    );
  }

  transition(from: TransactionStatus, to: TransactionStatus): boolean {
    if (from === to) return true;

    if (!this.isValidTransition(from, to)) {
      logger.error('Invalid state transition', {
        from,
        to,
        validTargets: this.getValidTransitions(from).join(', '),
      });
      return false;
    }

    logger.info('State transition', { from, to });
    this.emit('transition', { from, to });
    this.emit(`transition:${from}:${to}`, { from, to });
    return true;
  }

  getValidTransitions(status: TransactionStatus): TransactionStatus[] {
    return this.transitions
      .filter((t) => t.from.includes(status))
      .map((t) => t.to);
  }

  canTransitionTo(status: TransactionStatus, target: TransactionStatus): boolean {
    return this.isValidTransition(status, target);
  }
}

export { TransactionStateMachine, Transition };
