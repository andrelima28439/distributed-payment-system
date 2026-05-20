export enum NotificationType {
  TRANSACTION_APPROVED = 'TRANSACTION_APPROVED',
  TRANSACTION_DECLINED = 'TRANSACTION_DECLINED',
  CHARGEBACK = 'CHARGEBACK',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  RECONCILIATION_DISCREPANCY = 'RECONCILIATION_DISCREPANCY',
  SETTLEMENT_COMPLETED = 'SETTLEMENT_COMPLETED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  to: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPayload {
  userId: string;
  email?: string;
  phone?: string;
  webhookUrl?: string;
  preferences: NotificationChannel[];
  data: Record<string, unknown>;
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  timestamp: string;
  correlationId?: string;
}

export interface TemplateData {
  userName?: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  merchantName?: string;
  reason?: string;
  status?: string;
  date?: string;
  chargebackReason?: string;
  disputeId?: string;
  discrepancyType?: string;
  expectedAmount?: number;
  actualAmount?: number;
  settlementBatchId?: string;
  settledAmount?: number;
  fraudScore?: number;
  flaggedActivity?: string;
  [key: string]: unknown;
}
