export enum TransactionStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export interface TransactionRequest {
  amount: number;
  currency: string;
  cardNumber?: string;
  cardExpiry: string;
  cardCvv?: string;
  description?: string;
  metadata?: Record<string, string>;
  maskedCardNumber?: string;
}

export interface Transaction {
  id: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  maskedCardNumber: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export enum WebhookEvent {
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_CAPTURED = 'transaction.captured',
  TRANSACTION_CANCELLED = 'transaction.cancelled',
  TRANSACTION_REFUNDED = 'transaction.refunded',
  TRANSACTION_FAILED = 'transaction.failed',
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  transactionId: string;
  data: Partial<Transaction>;
  timestamp: string;
}

export interface PaymentToken {
  id: string;
  maskedCardNumber: string;
  cardExpiry: string;
  cardholderName?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
