import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { logger } from '../utils/logger.utils';
import {
  withDependencies,
  StateControllerDependencies,
} from '../controllers/content-state-controller';
import CustomError from '../errors/custom.error';
import { CustomObjectController } from '../controllers/custom-object.controller';
import { CONTENT_PAGE_CONTAINER, PAGE_STATE_CONTAINER } from '../constants';
import { PageState } from '../controllers/page.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';

/**
 * @deprecated Legacy grid-based pages API (state management). Superseded by the
 * Puck pages API (`/:businessUnitKey/puck-pages/:key/states`, see
 * `puck-page.route.ts`). Retained for backwards compatibility only — calls are
 * flagged at runtime by `deprecationMiddleware`. Do not build new functionality
 * on these routes.
 */
const pageStateRouter = Router();
const dependencies: StateControllerDependencies = {
  CONTENT_CONTAINER: CONTENT_PAGE_CONTAINER,
  CONTENT_STATE_CONTAINER: PAGE_STATE_CONTAINER,
};
const PageStateController = withDependencies<PageState>(dependencies);

// Get states for a content item
pageStateRouter.get(
  '/:businessUnitKey/pages/:key/states',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const stateKey = `${businessUnitKey}_${key}`;

      try {
        const object = await PageStateController.getState(req, stateKey);
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
pageStateRouter.put(
  '/:businessUnitKey/pages/:key/states/published',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clearDraft } = req.query;
      const { businessUnitKey, key } = req.params;
      const pageController = new CustomObjectController(
        req,
        CONTENT_PAGE_CONTAINER
      );
      const page = await pageController.getCustomObject(key);
      const item = page.value;

      const state = await PageStateController.createPublishedState(
        req,
        businessUnitKey,
        key,
        item,
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
pageStateRouter.delete(
  '/:businessUnitKey/pages/:key/states/draft',
  validateJwt,
  validateProject,
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;

      const state = await PageStateController.deleteDraftState(
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

export default pageStateRouter;
