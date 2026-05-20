import { config } from '../config';
import { Logger } from '../services/Logger';
import { NotificationType } from '../types';

const messageTemplates: Record<NotificationType, string> = {
  [NotificationType.TRANSACTION_APPROVED]: 'Transaction of {amount} {currency} at {merchantName} approved. Ref: {transactionId}',
  [NotificationType.TRANSACTION_DECLINED]: 'Transaction of {amount} {currency} at {merchantName} declined. Reason: {reason}. Ref: {transactionId}',
  [NotificationType.CHARGEBACK]: 'Chargeback filed for transaction {transactionId}. Amount: {amount} {currency}. Reason: {chargebackReason}',
  [NotificationType.FRAUD_DETECTED]: 'ALERT: Suspicious activity detected on transaction {transactionId}. Amount: {amount} {currency}. Contact support.',
  [NotificationType.RECONCILIATION_DISCREPANCY]: 'Reconciliation discrepancy in batch {settlementBatchId}. Expected: {expectedAmount} {currency}, Actual: {actualAmount} {currency}',
  [NotificationType.SETTLEMENT_COMPLETED]: 'Settlement completed for batch {settlementBatchId}. Amount: {settledAmount} {currency}',
};

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = data[key];
    return value != null ? String(value) : `{${key}}`;
  });
}

export async function sendSMS(
  to: string,
  type: NotificationType,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const template = messageTemplates[type] || 'Notification: {message}';
    const message = interpolate(template, data);

    // Placeholder: real Twilio integration would go here
    Logger.info('SMS sent successfully', {
      to,
      type,
      message,
      twilioAccountSid: config.twilio.accountSid.substring(0, 8) + '...',
      phoneNumber: config.twilio.phoneNumber,
    });

    return true;
  } catch (err) {
    const error = err as Error;
    Logger.error('Failed to send SMS', { to, type, error: error.message });
    throw error;
  }
}
