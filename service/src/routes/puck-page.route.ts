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
import * as PuckPageController from '../controllers/puck-page.controller';

const puckPageRouter = Router();

// ---------------------------------------------------------------------------
// List all puck pages for a business unit
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/puck-pages',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const pages = await PuckPageController.getPuckPages(req, businessUnitKey);
      res.json(pages);
    } catch (error) {
      logger.error('Failed to list puck pages:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Get a single puck page with its draft/published states
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/puck-pages/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const page = await PuckPageController.getPuckPageWithStates(
        req,
        businessUnitKey,
        key
      );
      res.json(page);
    } catch (error) {
      logger.error(`Failed to get puck page ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Create a puck page
// ---------------------------------------------------------------------------
puckPageRouter.post(
  '/:businessUnitKey/puck-pages',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new CustomError(400, 'value is required in request body');
      }

      const page = await PuckPageController.createPuckPage(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(page);
    } catch (error) {
      logger.error('Failed to create puck page:', error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Update a puck page (auto-saves draft state + version entry)
// ---------------------------------------------------------------------------
puckPageRouter.put(
  '/:businessUnitKey/puck-pages/:key',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new CustomError(400, 'value is required in request body');
      }

      const page = await PuckPageController.updatePuckPage(
        req,
        businessUnitKey,
        key,
        value
      );
      res.json(page);
    } catch (error) {
      logger.error(`Failed to update puck page ${req.params.key}:`, error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Delete a puck page (removes page + states + versions)
// ---------------------------------------------------------------------------
puckPageRouter.delete(
  '/:businessUnitKey/puck-pages/:key',
  validateJwt,
  validateProject,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      await PuckPageController.deletePuckPage(req, businessUnitKey, key);
      res.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete puck page ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Published puck page by key
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/published/puck-pages/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const page = await PuckPageController.getPublishedPuckPage(
        req,
        businessUnitKey,
        key
      );
      if (!page) throw new CustomError(404, 'Published puck page not found');
      res.json(page);
    } catch (error) {
      logger.error(
        `Failed to get published puck page ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Preview (draft || published) puck page by key
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/preview/puck-pages/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const page = await PuckPageController.getPreviewPuckPage(
        req,
        businessUnitKey,
        key
      );
      if (!page) throw new CustomError(404, 'Puck page not found');
      res.json(page);
    } catch (error) {
      logger.error(
        `Failed to get preview puck page ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Query published puck page by slug
// Body: { query: 'slug = "/home"' }
// ---------------------------------------------------------------------------
puckPageRouter.post(
  '/:businessUnitKey/published/puck-pages/query',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { query } = req.body;
      if (!query) throw new CustomError(400, 'query is required in request body');

      const page = await PuckPageController.queryPuckPage(
        req,
        businessUnitKey,
        query,
        'published'
      );
      if (!page) throw new CustomError(404, 'Published puck page not found');
      res.json(page);
    } catch (error) {
      logger.error('Failed to query published puck page:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Query preview puck page by slug
// ---------------------------------------------------------------------------
puckPageRouter.post(
  '/:businessUnitKey/preview/puck-pages/query',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { query } = req.body;
      if (!query) throw new CustomError(400, 'query is required in request body');

      const page = await PuckPageController.queryPuckPage(
        req,
        businessUnitKey,
        query,
        ['draft', 'published']
      );
      if (!page) throw new CustomError(404, 'Puck page not found');
      res.json(page);
    } catch (error) {
      logger.error('Failed to query preview puck page:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Get draft/published states for a page
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/puck-pages/:key/states',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const states = await PuckPageController.getPuckPageStates(
        req,
        businessUnitKey,
        key
      );
      res.json(states);
    } catch (error) {
      logger.error(`Failed to get states for puck page ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Publish a puck page (promote draft → published)
// ?clearDraft=true removes the draft after publishing
// ---------------------------------------------------------------------------
puckPageRouter.put(
  '/:businessUnitKey/puck-pages/:key/states/published',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const { clearDraft } = req.query;

      const state = await PuckPageController.publishPuckPage(
        req,
        businessUnitKey,
        key,
        clearDraft === 'true'
      );
      res.json(state);
    } catch (error) {
      logger.error(`Failed to publish puck page ${req.params.key}:`, error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Revert draft to published (delete draft state)
// ---------------------------------------------------------------------------
puckPageRouter.delete(
  '/:businessUnitKey/puck-pages/:key/states/draft',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;

      const state = await PuckPageController.revertPuckPageDraft(
        req,
        businessUnitKey,
        key
      );
      res.json(state);
    } catch (error) {
      logger.error(
        `Failed to revert draft for puck page ${req.params.key}:`,
        error
      );
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Get version history for a puck page
// ---------------------------------------------------------------------------
puckPageRouter.get(
  '/:businessUnitKey/puck-pages/:key/versions',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const versions = await PuckPageController.getPuckPageVersions(
        req,
        businessUnitKey,
        key
      );
      res.json(versions);
    } catch (error) {
      logger.error(
        `Failed to get versions for puck page ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

export default puckPageRouter;
