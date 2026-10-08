/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { logger } from '../utils/logger.utils';
import multer from 'multer';
import { FileControllerFactory } from '../controllers/file-controller';
import { Router, RequestHandler } from 'express';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { AuthenticatedRequest } from '../types/service.types';

const fileRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });
const fileController = FileControllerFactory.createFileController();

fileRouter.post(
  '/:businessUnitKey/upload-file',
  validateJwt,
  validateProject,
  upload.single('file') as any,
  (async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const { businessUnitKey } = req.params;
      const projectKey = (req as AuthenticatedRequest).user?.projectKey;
      const storagePath = projectKey
        ? `${projectKey}/${businessUnitKey}`
        : businessUnitKey;

      const title = req.body.title || '';
      const description = req.body.description || '';

      const fileUrl = await fileController.uploadFile(
        req.file,
        storagePath,
        {
          title,
          description,
        }
      );

      res.json({ url: fileUrl });
    } catch (error) {
      logger.error('Failed to upload file:', error);
      next(error);
    }
  }) as RequestHandler
);

fileRouter.get('/:businessUnitKey/media-library', requireProjectKey, (async (
  req,
  res,
  next
) => {
  try {
    const { businessUnitKey } = req.params;
    const projectKey = (req as AuthenticatedRequest).project?.projectKey;
    const storagePath = projectKey
      ? `${projectKey}/${businessUnitKey}`
      : businessUnitKey;

    const extensions = req.query.extensions
      ? String(req.query.extensions).split(',')
      : [];
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await fileController.getMediaLibrary(
      extensions,
      page,
      limit,
      storagePath
    );
    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch media library:', error);
    next(error);
  }
}) as RequestHandler);

export default fileRouter;
