import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing x-api-key header' });
    return;
  }

  if (apiKey !== config.apiKey) {
    const timestamp = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;

    if (timestamp && signature) {
      const message = `${apiKey}:${timestamp}:${JSON.stringify(req.body)}`;
      const expectedSignature = crypto
        .createHmac('sha256', config.apiKey)
        .update(message)
        .digest('hex');

      if (expectedSignature === signature) {
        next();
        return;
      }
    }

    res.status(401).json({ success: false, error: 'Invalid API key' });
    return;
  }

  next();
}
