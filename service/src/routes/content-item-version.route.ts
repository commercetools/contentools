import { NextFunction, Request, Response, Router } from 'express';
import { withDependencies as withContentVersionDependencies } from '../controllers/content-version-controller';
import { logger } from '../utils/logger.utils';
import { CONTENT_ITEM_VERSION_CONTAINER, MAX_VERSIONS } from '../constants';
import { ContentItemVersion } from '../controllers/content-item.controller';
import { requireProjectKey } from '../middleware/project-key.middleware';

/**
 * @deprecated Legacy content-items API (version history). Superseded by the Puck
 * content API (`/:businessUnitKey/puck-contents/:key/versions`, see
 * `puck-content.route.ts`). Retained for backwards compatibility only — calls are
 * flagged at runtime by `deprecationMiddleware`. Do not build new functionality
 * on these routes.
 */
const contentItemVersionRouter = Router();
const ContentVersionController =
  withContentVersionDependencies<ContentItemVersion>({
    CONTENT_VERSION_CONTAINER: CONTENT_ITEM_VERSION_CONTAINER,
    MAX_VERSIONS: MAX_VERSIONS,
  });

// Get all versions for a content item
contentItemVersionRouter.get(
  '/:businessUnitKey/content-items/:key/versions',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const versions = await ContentVersionController.getContentVersions(
        req,
        businessUnitKey,
        key
      );
      res.json(versions);
    } catch (error) {
      logger.error('Failed to get versions:', error);
      next(error);
    }
  }
);

export default contentItemVersionRouter;
