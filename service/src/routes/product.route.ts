import { NextFunction, Request, Response, Router } from 'express';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { logger } from '../utils/logger.utils';
import { AuthenticatedRequest } from '../types/service.types';
import { searchProductsController } from '../controllers/product.controller';

const productRouter = Router();

// ---------------------------------------------------------------------------
// Free-text product search for the editor's product-selection picker (task #4).
// GET /products/search?text=shoe&limit=20&locale=en-US
// ---------------------------------------------------------------------------
productRouter.get(
  '/products/search',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const text = String(req.query.text ?? req.query.q ?? '');
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const locale = String(req.query.locale ?? 'en-US');
      const results = await searchProductsController(
        req as AuthenticatedRequest,
        text,
        limit,
        locale
      );
      res.json(results);
    } catch (error) {
      logger.error('Failed to search products:', error);
      next(error);
    }
  }
);

export default productRouter;
