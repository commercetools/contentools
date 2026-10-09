/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { ToolInputError } from '../predicate';
import { bu, businessUnitKey } from '../schemas';
import { defineTool } from '../types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const mediaTools = [
  defineTool({
    name: 'list_media',
    title: 'List media files',
    group: 'media',
    access: 'read',
    description:
      'List uploaded media files, newest first. Returns { files, pagination: { limit, nextCursor, hasMore } }; keep calling with cursor = nextCursor while hasMore is true. A page may hold fewer than limit files when an extension filter is active. A 501 MEDIA_NOT_CONFIGURED error means the service has no storage provider.',
    shape: {
      businessUnitKey,
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z
        .string()
        .min(1)
        .max(2048)
        .optional()
        .describe(
          'Opaque cursor: pass pagination.nextCursor from the previous response to get the next page'
        ),
      extensions: z
        .array(z.string().regex(/^[A-Za-z0-9]{1,10}$/))
        .min(1)
        .max(20)
        .optional(),
    },
    request: (i, c) => {
      const q = new URLSearchParams();
      if (i.limit) q.set('limit', String(i.limit));
      if (i.cursor) q.set('cursor', i.cursor);
      if (i.extensions) q.set('extensions', i.extensions.join(','));
      const s = q.toString();
      return {
        method: 'GET',
        path: `${bu(i, c.defaultBusinessUnitKey)}/media-library${s ? `?${s}` : ''}`,
      };
    },
  }),
  defineTool({
    name: 'upload_media',
    title: 'Upload media file',
    group: 'media',
    access: 'write',
    description:
      'Upload one file (at most 5 MiB, base64 encoded) to the media library. Returns { url, key, name, size, contentType }. WRITES data. A 501 MEDIA_NOT_CONFIGURED error means the service has no storage provider; the service also restricts allowed file types.',
    shape: {
      businessUnitKey,
      fileName: z.string().min(1).max(255),
      fileContentBase64: z.string().min(1),
      title: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
    },
    request: (i, c) => {
      const approxBytes = Math.floor((i.fileContentBase64.length * 3) / 4);
      if (approxBytes > MAX_UPLOAD_BYTES) {
        throw new ToolInputError('File is larger than 5 MiB');
      }
      return {
        method: 'POST',
        path: `${bu(i, c.defaultBusinessUnitKey)}/upload-file`,
        multipart: {
          fields: { title: i.title ?? '', description: i.description ?? '' },
          file: { name: i.fileName, contentBase64: i.fileContentBase64 },
        },
      };
    },
  }),
];
