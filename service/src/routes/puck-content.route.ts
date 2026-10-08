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
import * as PuckContentController from '../controllers/puck-content.controller';

const puckContentRouter = Router();

// ---------------------------------------------------------------------------
// List all puck contents for a business unit (optional ?contentType= filter)
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/puck-contents',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const contentType = req.query.contentType as string | undefined;
      const contents = await PuckContentController.getPuckContents(
        req,
        businessUnitKey,
        contentType
      );
      res.json(contents);
    } catch (error) {
      logger.error('Failed to list puck contents:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Get a single puck content with its draft/published states
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/puck-contents/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const content = await PuckContentController.getPuckContentWithStates(
        req,
        businessUnitKey,
        key
      );
      res.json(content);
    } catch (error) {
      logger.error(`Failed to get puck content ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Create a puck content item
// ---------------------------------------------------------------------------
puckContentRouter.post(
  '/:businessUnitKey/puck-contents',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new CustomError(400, 'value is required in request body');
      }

      const content = await PuckContentController.createPuckContent(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(content);
    } catch (error) {
      logger.error('Failed to create puck content:', error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Update a puck content item (auto-saves draft state + version entry)
// ---------------------------------------------------------------------------
puckContentRouter.put(
  '/:businessUnitKey/puck-contents/:key',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new CustomError(400, 'value is required in request body');
      }

      const content = await PuckContentController.updatePuckContent(
        req,
        businessUnitKey,
        key,
        value
      );
      res.json(content);
    } catch (error) {
      logger.error(`Failed to update puck content ${req.params.key}:`, error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Delete a puck content item (removes content + states + versions)
// ---------------------------------------------------------------------------
puckContentRouter.delete(
  '/:businessUnitKey/puck-contents/:key',
  validateJwt,
  validateProject,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      await PuckContentController.deletePuckContent(req, businessUnitKey, key);
      res.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete puck content ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Published puck content by key
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/published/puck-contents/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const content = await PuckContentController.getPublishedPuckContent(
        req,
        businessUnitKey,
        key
      );
      if (!content) throw new CustomError(404, 'Published puck content not found');
      res.json(content);
    } catch (error) {
      logger.error(
        `Failed to get published puck content ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Preview (draft || published) puck content by key
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/preview/puck-contents/:key',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const content = await PuckContentController.getPreviewPuckContent(
        req,
        businessUnitKey,
        key
      );
      if (!content) throw new CustomError(404, 'Puck content not found');
      res.json(content);
    } catch (error) {
      logger.error(
        `Failed to get preview puck content ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Query published puck content by contentType
// Body: { query: 'contentType = "hero"' }
// ---------------------------------------------------------------------------
puckContentRouter.post(
  '/:businessUnitKey/published/puck-contents/query',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { query } = req.body;
      if (!query) throw new CustomError(400, 'query is required in request body');

      const content = await PuckContentController.queryPuckContent(
        req,
        businessUnitKey,
        query,
        'published'
      );
      if (!content) throw new CustomError(404, 'Published puck content not found');
      res.json(content);
    } catch (error) {
      logger.error('Failed to query published puck content:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Query preview puck content by contentType
// ---------------------------------------------------------------------------
puckContentRouter.post(
  '/:businessUnitKey/preview/puck-contents/query',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const { query } = req.body;
      if (!query) throw new CustomError(400, 'query is required in request body');

      const content = await PuckContentController.queryPuckContent(
        req,
        businessUnitKey,
        query,
        ['draft', 'published']
      );
      if (!content) throw new CustomError(404, 'Puck content not found');
      res.json(content);
    } catch (error) {
      logger.error('Failed to query preview puck content:', error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Get draft/published states for a content item
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/puck-contents/:key/states',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const states = await PuckContentController.getPuckContentStates(
        req,
        businessUnitKey,
        key
      );
      res.json(states);
    } catch (error) {
      logger.error(`Failed to get states for puck content ${req.params.key}:`, error);
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Publish a puck content item (promote draft → published)
// ?clearDraft=true removes the draft after publishing
// ---------------------------------------------------------------------------
puckContentRouter.put(
  '/:businessUnitKey/puck-contents/:key/states/published',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const { clearDraft } = req.query;

      const state = await PuckContentController.publishPuckContent(
        req,
        businessUnitKey,
        key,
        clearDraft === 'true'
      );
      res.json(state);
    } catch (error) {
      logger.error(`Failed to publish puck content ${req.params.key}:`, error);
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Revert draft to published (delete draft state)
// ---------------------------------------------------------------------------
puckContentRouter.delete(
  '/:businessUnitKey/puck-contents/:key/states/draft',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;

      const state = await PuckContentController.revertPuckContentDraft(
        req,
        businessUnitKey,
        key
      );
      res.json(state);
    } catch (error) {
      logger.error(
        `Failed to revert draft for puck content ${req.params.key}:`,
        error
      );
      next(error);
    }
  }) as RequestHandler
);

// ---------------------------------------------------------------------------
// Get version history for a puck content item
// ---------------------------------------------------------------------------
puckContentRouter.get(
  '/:businessUnitKey/puck-contents/:key/versions',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const versions = await PuckContentController.getPuckContentVersions(
        req,
        businessUnitKey,
        key
      );
      res.json(versions);
    } catch (error) {
      logger.error(
        `Failed to get versions for puck content ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

export default puckContentRouter;
