import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/service.types';
import {
  getProjectByKey,
  updateProjectLastAccessed,
} from '../utils/firestore.utils';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

const PROJECT_KEY_HEADER = 'x-project-key';

/**
 * Middleware that reads x-project-key header, fetches the project,
 * and sets req.project. Use for read-only (fetch) routes that do not use JWT.
 */
export async function requireProjectKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectKey = req.headers[PROJECT_KEY_HEADER];
    const value =
      typeof projectKey === 'string' ? projectKey.trim() : undefined;

    if (!value) {
      throw new CustomError(400, 'x-project-key header is required');
    }

    const project = await getProjectByKey(value);

    if (!project) {
      logger.warn(`Project not found: ${value}`);
      throw new CustomError(403, 'Project not found or not registered');
    }

    if (!project.isActive) {
      logger.warn(`Inactive project access attempt: ${value}`);
      throw new CustomError(403, 'Project is inactive');
    }

    (req as AuthenticatedRequest).project = project;

    updateProjectLastAccessed(value).catch((error) => {
      logger.warn(`Failed to update last accessed time for ${value}`, error);
    });

    logger.debug(`Project resolved from header: ${value}`);
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      logger.error('Project key middleware error', error);
      next(new CustomError(500, 'Project resolution failed'));
    }
  }
}
