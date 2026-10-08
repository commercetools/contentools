import { NextFunction, Request, Response, Router } from 'express';
import { withDependencies as withContentVersionDependencies } from '../controllers/content-version-controller';
import { logger } from '../utils/logger.utils';
import { PageVersion } from '../controllers/page.controller';
import { MAX_VERSIONS, PAGE_VERSION_CONTAINER } from '../constants';
import { requireProjectKey } from '../middleware/project-key.middleware';

/**
 * @deprecated Legacy grid-based pages API (version history). Superseded by the
 * Puck pages API (`/:businessUnitKey/puck-pages/:key/versions`, see
 * `puck-page.route.ts`). Retained for backwards compatibility only — calls are
 * flagged at runtime by `deprecationMiddleware`. Do not build new functionality
 * on these routes.
 */
const pageVersionRouter = Router();
const PageVersionController = withContentVersionDependencies<PageVersion>({
  CONTENT_VERSION_CONTAINER: PAGE_VERSION_CONTAINER,
  MAX_VERSIONS: MAX_VERSIONS,
});

// Get all versions for a page
pageVersionRouter.get(
  '/:businessUnitKey/pages/:key/versions',
  requireProjectKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey, key } = req.params;
      const versions = await PageVersionController.getContentVersions(
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

export default pageVersionRouter;
