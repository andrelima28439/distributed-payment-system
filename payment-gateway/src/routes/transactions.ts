import { Router, Request, Response } from 'express';
import { transactionService } from '../services/TransactionService';
import { TransactionStatus } from '../types';
import { validateTransaction } from '../middleware/validator';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

router.post('/v1/transactions', authenticateApiKey, validateTransaction, async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);
    transactionService.simulateAuthorization(transaction.id);
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/v1/transactions/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.getTransaction(req.params.id);

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/v1/transactions/:id/capture', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.captureTransaction(req.params.id);
    res.json({ success: true, data: transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 409;
    res.status(status).json({ success: false, error: message });
  }
});

router.post('/v1/transactions/:id/cancel', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.cancelTransaction(req.params.id);
    res.json({ success: true, data: transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 409;
    res.status(status).json({ success: false, error: message });
  }
});

router.post('/v1/transactions/:id/refund', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.refundTransaction(req.params.id);
    res.json({ success: true, data: transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 409;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
