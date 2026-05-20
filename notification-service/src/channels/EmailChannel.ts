import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { Logger } from '../services/Logger';
import { render } from '../templates/engine';
import { NotificationType } from '../types';

const transporter: Transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

const templateMap: Record<NotificationType, string> = {
  [NotificationType.TRANSACTION_APPROVED]: 'transaction-approved',
  [NotificationType.TRANSACTION_DECLINED]: 'transaction-declined',
  [NotificationType.CHARGEBACK]: 'chargeback',
  [NotificationType.FRAUD_DETECTED]: 'fraud-detected',
  [NotificationType.RECONCILIATION_DISCREPANCY]: 'reconciliation',
  [NotificationType.SETTLEMENT_COMPLETED]: 'transaction-approved',
};

export async function sendEmail(
  to: string,
  subject: string,
  type: NotificationType,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const templateName = templateMap[type] || 'transaction-approved';
    const htmlBody = render(templateName, data);

    const mailOptions = {
      from: `"PayFlow" <${config.smtp.from}>`,
      to,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    Logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
    return true;
  } catch (err) {
    const error = err as Error;
    Logger.error('Failed to send email', { to, subject, error: error.message });
    throw error;
  }
}
