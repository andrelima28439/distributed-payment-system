import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
    queue: 'notification_queue',
    exchange: 'payment_events',
    routingKey: 'notification.*',
    prefetch: parseInt(process.env.RABBITMQ_PREFETCH || '10', 10),
    retryInterval: parseInt(process.env.RABBITMQ_RETRY_INTERVAL || '5000', 10),
    maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '10', 10),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || 're_placeholder',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'placeholder',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'placeholder',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+15555555555',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@payflow.com',
  },
  rateLimit: {
    email: parseInt(process.env.RATE_LIMIT_EMAIL || '10', 10),
    sms: parseInt(process.env.RATE_LIMIT_SMS || '5', 10),
    webhook: parseInt(process.env.RATE_LIMIT_WEBHOOK || '20', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD || '5', 10),
    resetTimeoutMs: parseInt(process.env.CB_RESET_TIMEOUT_MS || '30000', 10),
  },
};
