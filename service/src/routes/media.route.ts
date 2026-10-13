/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import multer, { MulterError } from 'multer';
import { MediaError } from '../media/errors';
import type { MediaService } from '../media/media.service';
import { canonicalMime } from '../media/mime';
import { requireAuth } from '../middleware/auth.middleware';
import { getLogger } from '../utils/logger.utils';

export interface MediaRouterDeps {
  service: MediaService;
  limits: { maxUploadBytes: number };
  allowedMimeTypes: ReadonlySet<string>;
}

/** Self-protecting: authenticates unless the service-level gate already did. */
const authenticated: RequestHandler = (req, res, next) =>
  req.principal ? next() : requireAuth(req, res, next);

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function mapMulterError(err: unknown): unknown {
  if (!(err instanceof MulterError)) return err;
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new MediaError(413, 'MEDIA_FILE_TOO_LARGE', 'File is too large');
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
    case 'LIMIT_PART_COUNT':
      return new MediaError(
        400,
        'MEDIA_FILE_COUNT_EXCEEDED',
        'Exactly one file is accepted'
      );
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_FIELD_KEY':
      return new MediaError(
        400,
        'MEDIA_INVALID_METADATA',
        'Invalid form fields'
      );
    default:
      return new MediaError(400, 'MEDIA_FILE_REQUIRED', 'Invalid upload');
  }
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

export function createMediaRouter(deps: MediaRouterDeps): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: deps.limits.maxUploadBytes,
      files: 1,
      fields: 4,
      fieldSize: 4096,
      parts: 6,
    },
    fileFilter: (_req, file, cb) => {
      if (deps.allowedMimeTypes.has(canonicalMime(file.mimetype))) {
        cb(null, true);
      } else {
        cb(
          new MediaError(
            415,
            'MEDIA_TYPE_NOT_ALLOWED',
            'Content type is not allowed'
          )
        );
      }
    },
  });
  const single = upload.single('file');
  const uploadSingle: RequestHandler = (req, res, next: NextFunction) => {
    single(req, res, (err: unknown) =>
      next(err ? mapMulterError(err) : undefined)
    );
  };

  router.post(
    '/:businessUnitKey/upload-file',
    authenticated,
    uploadSingle,
    asyncHandler(async (req, res) => {
      const file = req.file;
      if (!file) {
        throw new MediaError(
          400,
          'MEDIA_FILE_REQUIRED',
          'A file part named "file" is required'
        );
      }
      const started = Date.now();
      const businessUnitKey = String(req.params.businessUnitKey);
      const result = await deps.service.upload({
        businessUnitKey,
        file,
        title: text((req.body as Record<string, unknown> | undefined)?.title),
        description: text(
          (req.body as Record<string, unknown> | undefined)?.description
        ),
      });
      getLogger().info('media.upload', {
        businessUnitKey,
        size: result.size,
        contentType: result.contentType,
        durationMs: Date.now() - started,
      });
      res.json(result);
    })
  );

  router.get(
    '/:businessUnitKey/media-library',
    authenticated,
    asyncHandler(async (req, res) => {
      const q = req.query;
      const one = (v: unknown): string | undefined =>
        typeof v === 'string' ? v : undefined;
      res.json(
        await deps.service.list({
          businessUnitKey: String(req.params.businessUnitKey),
          limit: one(q.limit),
          cursor: one(q.cursor),
          extensions: one(q.extensions),
        })
      );
    })
  );

  return router;
}
