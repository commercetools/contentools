import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { logger } from '../utils/logger.utils';
import {
  StateControllerDependencies,
  withDependencies,
} from '../controllers/content-state-controller';
import CustomError from '../errors/custom.error';
import {
  CONTENT_ITEM_CONTAINER,
  CONTENT_ITEM_STATE_CONTAINER,
} from '../constants';
import { ContentItemState } from '../controllers/content-item.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { AuthenticatedRequest } from '../types/service.types';

/**
 * @deprecated Legacy content-items API (state management). Superseded by the Puck
 * content API (`/:businessUnitKey/puck-contents/:key/states`, see
 * `puck-content.route.ts`). Retained for backwards compatibility only — calls are
 * flagged at runtime by `deprecationMiddleware`. Do not build new functionality
 * on these routes.
 */
const contentItemStateRouter = Router();
const dependencies: StateControllerDependencies = {
  CONTENT_CONTAINER: CONTENT_ITEM_CONTAINER,
  CONTENT_STATE_CONTAINER: CONTENT_ITEM_STATE_CONTAINER,
};
const ContentStateController = withDependencies<ContentItemState>(dependencies);

// Get states for a content item
contentItemStateRouter.get(
  '/:businessUnitKey/content-items/:key/states',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const stateKey = `${businessUnitKey}_${key}`;

      try {
        const object = await ContentStateController.getState(req, stateKey);
        res.json(object);
      } catch (error) {
        // If not found, return empty states object
        if ((error as any).statusCode === 404) {
          res.json({
            key,
            businessUnitKey,
            states: {},
          });
        } else {
          throw new CustomError(500, 'Failed to get states');
        }
      }
    } catch (error) {
      logger.error('Failed to get states:', error);
      next(error);
    }
  }
);

// Publish state (move draft to published)
contentItemStateRouter.put(
  '/:businessUnitKey/content-items/:key/states/published',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clearDraft } = req.query;
      const { businessUnitKey, key } = req.params;
      const { value } = req.body;

      const state = await ContentStateController.createPublishedState(
        req,
        businessUnitKey,
        key,
        value,
        clearDraft === 'true'
      );
      res.json(state);
    } catch (error) {
      logger.error('Failed to publish state:', error);
      next(error);
    }
  }) as RequestHandler
);

// Delete draft state (revert to published)
contentItemStateRouter.delete(
  '/:businessUnitKey/content-items/:key/states/draft',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;

      const state = await ContentStateController.deleteDraftState(
        req,
        businessUnitKey,
        key
      );
      res.json(state);
    } catch (error) {
      logger.error('Failed to delete draft state:', error);
      next(error);
    }
  }) as RequestHandler
);

export default contentItemStateRouter;
