import { Router, Request, Response } from 'express';
import { tokenService } from '../services/TokenService';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

router.post('/v1/tokens', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const { cardNumber, cardExpiry, cardholderName } = req.body;

    if (!cardNumber || !cardExpiry) {
      res.status(400).json({ success: false, error: 'cardNumber and cardExpiry are required' });
      return;
    }

    const token = tokenService.createToken(cardNumber, cardExpiry, cardholderName);
    res.status(201).json({ success: true, data: token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/v1/tokens/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const token = tokenService.getToken(req.params.id);

    if (!token) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }

    res.json({ success: true, data: token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
