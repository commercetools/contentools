import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import * as PageController from '../controllers/page.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';

/**
 * @deprecated Legacy grid-based pages API (page rows / grid cells). Superseded by
 * the Puck pages API (`/:businessUnitKey/puck-pages`, see `puck-page.route.ts`),
 * where layout is stored as Puck data. Retained for backwards compatibility only —
 * calls are flagged at runtime by `deprecationMiddleware`. Do not build new
 * functionality on these routes.
 */
const pageRowRouter = Router();

pageRowRouter.delete(
  '/:businessUnitKey/pages/:key/rows/:rowId',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key, rowId } = req.params;
      const object = await PageController.removeRowFromPage(
        req,
        businessUnitKey,
        key,
        rowId
      );
      res.status(200).json(object);
    } catch (error) {
      logger.error(
        `Failed to remove row from page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

pageRowRouter.post(
  '/:businessUnitKey/pages/:key/rows',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key } = req.params;
      const object = await PageController.addRowToPage(
        req,
        businessUnitKey,
        key
      );
      res.status(201).json(object);
    } catch (error) {
      logger.error(
        `Failed to add row to page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

pageRowRouter.put(
  '/:businessUnitKey/pages/:key/rows/:rowId/cells/:cellId',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key, rowId, cellId } = req.params;
      const { updates } = req.body;

      const object = await PageController.updateCellSpanInPage(
        req,
        businessUnitKey,
        key,
        rowId,
        cellId,
        updates
      );
      res.status(200).json(object);
    } catch (error) {
      logger.error(
        `Failed to update cell span in page with key ${req.params.key}:`,
        error
      );

      next(error);
    }
  }
);

export default pageRowRouter;
