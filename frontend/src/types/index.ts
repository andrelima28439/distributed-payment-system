export type TransactionStatus = 'pending' | 'approved' | 'declined' | 'failed' | 'refunded' | 'chargeback';
export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WebhookEvent = 'transaction.created' | 'transaction.updated' | 'transaction.failed' | 'chargeback.opened' | 'fraud.detected';
export type WebhookStatus = 'active' | 'inactive' | 'errored';
export type DeliveryStatus = 'success' | 'failed' | 'retrying';
export type ReconciliationStatus = 'pending' | 'matched' | 'mismatched' | 'unmatched';
export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'approve' | 'reject';
export type ChargebackStatus = 'received' | 'under_review' | 'disputed' | 'won' | 'lost' | 'accepted';
export type ReportFormat = 'csv' | 'excel' | 'pdf';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  merchantId: string;
  customerEmail: string;
  paymentMethod: string;
  timestamp: string;
  riskScore: number;
  country: string;
  metadata?: Record<string, string>;
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  severity: FraudSeverity;
  ruleName: string;
  description: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  riskScore: number;
  transaction?: Transaction;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret: string;
  createdAt: string;
  lastDelivery?: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  attemptCount: number;
  lastAttempt: string;
  responseCode?: number;
  responseBody?: string;
}

export interface ReconciliationRecord {
  id: string;
  transactionId: string;
  bankReference: string;
  amount: number;
  fee: number;
  netAmount: number;
  transactionDate: string;
  settlementDate: string;
  status: ReconciliationStatus;
  discrepancy?: string;
}

export interface Discrepancy {
  id: string;
  transactionId: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  reason: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ipAddress: string;
  userAgent: string;
}

export interface Chargeback {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  reason: string;
  status: ChargebackStatus;
  receivedDate: string;
  dueDate: string;
  resolvedDate?: string;
  evidence: ChargebackEvidence[];
  respondent: string;
  notes: string;
}

export interface ChargebackEvidence {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  url: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'risk' | 'processing' | 'routing' | 'compliance';
  condition: string;
  action: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  type: 'daily_summary' | 'monthly_statement' | 'transaction_log' | 'settlement_report' | 'fraud_analysis';
  format: ReportFormat;
  status: ReportStatus;
  dateRange: { start: string; end: string };
  createdAt: string;
  completedAt?: string;
  url?: string;
  errorMessage?: string;
}

export interface DashboardMetrics {
  transactionsPerSecond: number;
  totalVolume: number;
  averageValue: number;
  successRate: number;
  activeMerchants: number;
  pendingReconciliation: number;
  fraudAlerts: number;
}

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
}
