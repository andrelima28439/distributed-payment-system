export enum TransactionStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  FRAUD_CHECK = 'FRAUD_CHECK',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  CAPTURED = 'CAPTURED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  merchantId: string;
  merchantName: string;
  customerId: string;
  customerEmail: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface QueueMessage {
  pattern: string;
  data: Transaction;
  correlationId: string;
  timestamp: string;
  retryCount?: number;
  priority?: number;
}

export interface WorkerResult {
  success: boolean;
  transactionId: string;
  status: TransactionStatus;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  processingTimeMs: number;
}
