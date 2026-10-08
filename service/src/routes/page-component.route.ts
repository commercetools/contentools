import { logger } from '../utils/logger.utils';
import { Router } from 'express';
import * as PageController from '../controllers/page.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';

/**
 * @deprecated Legacy grid-based pages API (page components). Superseded by the
 * Puck pages API (`/:businessUnitKey/puck-pages`, see `puck-page.route.ts`), where
 * layout is stored as Puck data. Retained for backwards compatibility only — calls
 * are flagged at runtime by `deprecationMiddleware`. Do not build new functionality
 * on these routes.
 */
const pageComponentRouter = Router();

pageComponentRouter.post(
  '/:businessUnitKey/pages/:key/components',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key } = req.params;
      const { componentType, rowId, cellId } = req.body;
      const object = await PageController.addContentItemToPage(
        req,
        businessUnitKey,
        key,
        componentType,
        rowId,
        cellId
      );
      res.status(201).json(object);
    } catch (error) {
      logger.error(
        `Failed to add component to page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

pageComponentRouter.post(
  '/:businessUnitKey/pages/:key/components/:contentItemKey/move',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key, contentItemKey } = req.params;
      const { sourceRowId, sourceCellId, targetRowId, targetCellId } = req.body;
      const object = await PageController.moveContentItemInPage(
        req,
        businessUnitKey,
        key,
        contentItemKey,
        sourceRowId,
        sourceCellId,
        targetRowId,
        targetCellId
      );
      res.status(201).json(object);
    } catch (error) {
      logger.error(
        `Failed to add component to page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

pageComponentRouter.put(
  '/:businessUnitKey/pages/:key/components/:contentItemKey',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key, contentItemKey } = req.params;
      const { updates } = req.body;
      const object = await PageController.updateComponentInPage(
        req,
        businessUnitKey,
        key,
        contentItemKey,
        updates
      );
      res.status(200).json(object);
    } catch (error) {
      logger.error(
        `Failed to update component in page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

pageComponentRouter.delete(
  '/:businessUnitKey/pages/:key/components/:contentItemKey',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const { businessUnitKey, key, contentItemKey } = req.params;
      const object = await PageController.removeComponentFromPage(
        req,
        businessUnitKey,
        key,
        contentItemKey
      );
      res.status(200).json(object);
    } catch (error) {
      logger.error(
        `Failed to remove component from page with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

export default pageComponentRouter;
