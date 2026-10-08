import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/service.types';
import {
  getProjectByKey,
  updateProjectLastAccessed,
} from '../utils/firestore.utils';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

/**
 * Middleware to validate project exists and is active
 * Requires validateJwt middleware to be run first
 */
export async function validateProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user data is attached (from JWT middleware)
    if (!req.user || !req.user.projectKey) {
      throw new CustomError(401, 'Authentication required');
    }

    const projectKey = req.user.projectKey;

    // Get project from Firestore
    const project = await getProjectByKey(projectKey);

    if (!project) {
      logger.warn(`Project not found: ${projectKey}`);
      throw new CustomError(403, 'Project not found or not registered');
    }

    // Check if project is active
    if (!project.isActive) {
      logger.warn(`Inactive project access attempt: ${projectKey}`);
      throw new CustomError(403, 'Project is inactive');
    }

    // Attach project data to request
    req.project = project;

    // Update last accessed time (fire and forget)
    updateProjectLastAccessed(projectKey).catch((error) => {
      logger.warn(
        `Failed to update last accessed time for ${projectKey}`,
        error
      );
    });

    logger.debug(`Project validated: ${projectKey}`);
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      logger.error('Project validation error', error);
      next(new CustomError(500, 'Project validation failed'));
    }
  }
}
