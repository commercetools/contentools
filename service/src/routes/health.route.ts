import { Router } from 'express';
import type { Request, Response } from 'express';

const handler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    service: 'contentools-service',
    timestamp: new Date().toISOString(),
  });
};

export const healthRouter = Router();
healthRouter.get('/health', handler);
healthRouter.get('/status', handler);
