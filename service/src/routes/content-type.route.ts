import { Router, RequestHandler } from 'express';
import { logger } from '../utils/logger.utils';
import { CustomObjectController } from '../controllers/custom-object.controller';
import { importDefaultContentTypes } from '../controllers/content-type-import.controller';
import { CONTENT_TYPE_CONTAINER } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';

const contentTypeRouter = Router();

contentTypeRouter.get(
  '/content-type',
  requireProjectKey,
  async (req, res, next) => {
    try {
      const contentTypeController = new CustomObjectController(
        req,
        CONTENT_TYPE_CONTAINER
      );
      const dynamicContentTypes =
        await contentTypeController.getCustomObjects(undefined, undefined, 100);

      res.json([
        ...dynamicContentTypes.map((item) => ({
          id: item.id,
          key: item.key,
          ...item.value,
        })),
      ]);
    } catch (error) {
      logger.error('Failed to get content-type objects:', error);
      next(error);
    }
  }
);

contentTypeRouter.get(
  '/content-type/:key',
  requireProjectKey,
  async (req, res, next) => {
    try {
      const contentTypeController = new CustomObjectController(
        req,
        CONTENT_TYPE_CONTAINER
      );
      const { key } = req.params;
      const object = await contentTypeController.getCustomObject(key);
      res.json({
        id: object.key,
        key: object.key,
        ...object.value,
      });
    } catch (error) {
      logger.error(
        `Failed to get content-type object with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

contentTypeRouter.post(
  '/content-type/import',
  validateJwt,
  validateProject,
  (async (req, res, next) => {
    try {
      const result = await importDefaultContentTypes(req);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to import default content types:', error);
      next(error);
    }
  }) as RequestHandler
);

contentTypeRouter.post('/content-type', validateJwt, validateProject, (async (
  req,
  res,
  next
) => {
  try {
    const contentTypeController = new CustomObjectController(
      req,
      CONTENT_TYPE_CONTAINER
    );
    const key = `type-${uuidv4()}`;
    const { value } = req.body;
    const object = await contentTypeController.createCustomObject(key, {
      ...value,
      key,
    });
    res.status(201).json(object);
  } catch (error) {
    logger.error(
      `Failed to create registry object with key ${req.params.key}:`,
      error
    );
    next(error);
  }
}) as RequestHandler);

contentTypeRouter.put(
  '/content-type/:key',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const contentTypeController = new CustomObjectController(
        req,
        CONTENT_TYPE_CONTAINER
      );
      const { key } = req.params;
      const { value } = req.body;
      const object = await contentTypeController.updateCustomObject(key, value);
      res.json(object);
    } catch (error) {
      logger.error(
        `Failed to update registry object with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

contentTypeRouter.delete(
  '/content-type/:key',
  validateJwt,
  validateProject,
  async (req, res, next) => {
    try {
      const contentTypeController = new CustomObjectController(
        req,
        CONTENT_TYPE_CONTAINER
      );
      const { key } = req.params;
      await contentTypeController.deleteCustomObject(key);
      res.status(204).send();
    } catch (error) {
      logger.error(
        `Failed to update registry object with key ${req.params.key}:`,
        error
      );
      next(error);
    }
  }
);

export default contentTypeRouter;
