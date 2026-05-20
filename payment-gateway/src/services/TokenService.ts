import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { PaymentToken } from '../types';

class TokenService {
  private tokens: Map<string, PaymentToken> = new Map();

  createToken(cardNumber: string, cardExpiry: string, cardholderName?: string): PaymentToken {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const maskedCardNumber = `****${cardNumber.slice(-4)}`;

    const token: PaymentToken = {
      id: tokenId,
      maskedCardNumber,
      cardExpiry,
      cardholderName,
      createdAt: new Date().toISOString(),
    };

    this.tokens.set(tokenId, token);
    logger.info('Payment token created', { tokenId });

    return token;
  }

  getToken(id: string): PaymentToken | null {
    const token = this.tokens.get(id);

    if (!token) {
      logger.warn('Payment token not found', { tokenId: id });
      return null;
    }

    logger.info('Payment token retrieved', { tokenId: id });
    return token;
  }
}

export const tokenService = new TokenService();
