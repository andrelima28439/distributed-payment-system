import { Request, Response, NextFunction } from 'express';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'BRL', 'JPY'];
const CARD_NUMBER_REGEX = /^\d{13,19}$/;
const EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_REGEX = /^\d{3,4}$/;

function maskCardNumber(cardNumber: string): string {
  return `****${cardNumber.slice(-4)}`;
}

export function validateTransaction(req: Request, res: Response, next: NextFunction): void {
  const { amount, currency, cardNumber, cardExpiry, cardCvv } = req.body;

  const errors: string[] = [];

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
    errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }

  if (!cardNumber || !CARD_NUMBER_REGEX.test(cardNumber)) {
    errors.push('Invalid card number');
  }

  if (!cardExpiry || !EXPIRY_REGEX.test(cardExpiry)) {
    errors.push('Invalid card expiry (must be MM/YY)');
  }

  if (!cardCvv || !CVV_REGEX.test(cardCvv)) {
    errors.push('Invalid CVV');
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, error: 'Validation failed', message: errors.join('; ') });
    return;
  }

  req.body.maskedCardNumber = maskCardNumber(cardNumber);
  delete req.body.cardNumber;
  delete req.body.cardCvv;

  next();
}

export function validateWebhookRegistration(req: Request, res: Response, next: NextFunction): void {
  const { url, events } = req.body;

  const errors: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    errors.push('At least one event must be specified');
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, error: 'Validation failed', message: errors.join('; ') });
    return;
  }

  next();
}
