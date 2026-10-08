import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import CustomError from '../errors/custom.error';
import { validateJwt } from '../middleware/jwt.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { validateProject } from '../middleware/project.middleware';
import { logger } from '../utils/logger.utils';
import * as PuckTemplateController from '../controllers/puck-template.controller';
import type { PuckTemplateKind } from '../controllers/puck-template.controller';

const puckTemplateRouter = Router();

// ---------------------------------------------------------------------------
// List templates for a business unit, optional ?kind=page|content filter
// ---------------------------------------------------------------------------
puckTemplateRouter.get(
  '/:businessUnitKey/puck-templates',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const kindParam = req.query.kind as string | undefined;
      const kind =
        kindParam === 'page' || kindParam === 'content'
          ? (kindParam as PuckTemplateKind)
          : undefined;
      const templates = await PuckTemplateController.getPuckTemplates(
        req,
        businessUnitKey,
        kind
      );
      res.json(templates);
    } catch (error) {
      logger.error('Failed to list puck templates:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Get a single template
// ---------------------------------------------------------------------------
puckTemplateRouter.get(
  '/:businessUnitKey/puck-templates/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const template = await PuckTemplateController.getPuckTemplate(req, key);
      res.json(template);
    } catch (error) {
      logger.error(`Failed to get puck template ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Create a template
// ---------------------------------------------------------------------------
puckTemplateRouter.post(
  '/:businessUnitKey/puck-templates',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new CustomError(400, 'value is required in request body');
      }

      const template = await PuckTemplateController.createPuckTemplate(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(template);
    } catch (error) {
      logger.error('Failed to create puck template:', error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Delete a template
// ---------------------------------------------------------------------------
puckTemplateRouter.delete(
  '/:businessUnitKey/puck-templates/:key',
  validateJwt,
  validateProject,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      await PuckTemplateController.deletePuckTemplate(req, key);
      res.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete puck template ${req.params.key}:`, error);
      next(error);
    }
  }
);

export default puckTemplateRouter;
