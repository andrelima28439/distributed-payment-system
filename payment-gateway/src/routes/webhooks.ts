import { Router, Request, Response } from 'express';
import { webhookService } from '../services/WebhookService';
import { validateWebhookRegistration } from '../middleware/validator';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

router.post('/v1/webhooks/register', authenticateApiKey, validateWebhookRegistration, (req: Request, res: Response) => {
  try {
    const { url, events } = req.body;
    const webhook = webhookService.registerWebhook(url, events);
    res.status(201).json({ success: true, data: webhook });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/v1/webhooks', authenticateApiKey, (_req: Request, res: Response) => {
  try {
    const webhooks = webhookService.listWebhooks();
    res.json({ success: true, data: webhooks });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

router.delete('/v1/webhooks/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const deleted = webhookService.deleteWebhook(req.params.id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
