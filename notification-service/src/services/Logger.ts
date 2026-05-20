import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? ` ${JSON.stringify(meta, null, 2)}`
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

export class Logger {
  static info(message: string, meta?: Record<string, unknown>): void {
    logger.info(message, meta);
  }

  static error(message: string, meta?: Record<string, unknown>): void {
    logger.error(message, meta);
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(message, meta);
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(message, meta);
  }

  static child(defaultMeta: Record<string, unknown>): winston.Logger {
    return logger.child(defaultMeta);
  }
}
