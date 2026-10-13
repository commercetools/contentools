/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { getLogger } from '../utils/logger.utils';
import type { MediaConfig } from './config';
import { decodeCursor, encodeCursor } from './cursor';
import { MediaError } from './errors';
import {
  assertBusinessUnitKey,
  buildObjectKey,
  listPrefix,
  newObjectId,
  sanitizeFileName,
} from './keys';
import { canonicalMime, extensionFor, isImageMime, sniffMime } from './mime';
import type { MediaFile, StorageProvider } from './types';

export interface MediaServiceDeps {
  config: MediaConfig;
  getProvider: () => Promise<StorageProvider | null>;
  now?: () => number;
  newId?: () => string;
}

export interface UploadResult {
  url: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
}

export interface ListResult {
  files: MediaFile[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface MediaService {
  upload(i: {
    businessUnitKey: string;
    file: { buffer: Buffer; originalname: string; mimetype: string };
    title?: string;
    description?: string;
  }): Promise<UploadResult>;
  list(i: {
    businessUnitKey: string;
    limit?: string | number;
    cursor?: string;
    extensions?: string;
  }): Promise<ListResult>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SCAN_PAGES = 5;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'];

const extensionOf = (name: string): string =>
  name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';

function parseLimit(raw: string | number | undefined): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, n));
}

function parseExtensions(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === '') return [];
  const list = raw
    .split(',')
    .map((e) => e.trim().replace(/^\./, '').toLowerCase());
  if (list.length > 20 || list.some((e) => !/^[a-z0-9]{1,10}$/.test(e))) {
    throw new MediaError(
      400,
      'MEDIA_INVALID_EXTENSIONS',
      'Invalid extensions filter'
    );
  }
  return [...new Set(list)].sort();
}

export function createMediaService(deps: MediaServiceDeps): MediaService {
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? newObjectId;

  const requireProvider = async (): Promise<StorageProvider> => {
    const provider = await deps.getProvider();
    if (!provider) {
      throw new MediaError(
        501,
        'MEDIA_NOT_CONFIGURED',
        'Media storage is not configured'
      );
    }
    return provider;
  };

  return {
    async upload({ businessUnitKey, file, title, description }) {
      const provider = await requireProvider();
      assertBusinessUnitKey(businessUnitKey);
      if (
        (title !== undefined && title.length > MAX_TITLE) ||
        (description !== undefined && description.length > MAX_DESCRIPTION)
      ) {
        throw new MediaError(
          400,
          'MEDIA_INVALID_METADATA',
          'Title or description is too long'
        );
      }
      const declared = canonicalMime(file.mimetype);
      if (!deps.config.allowedMimeTypes.has(declared)) {
        throw new MediaError(
          415,
          'MEDIA_TYPE_NOT_ALLOWED',
          'Content type is not allowed'
        );
      }
      const sniffed = sniffMime(file.buffer);
      if (sniffed !== declared) {
        throw new MediaError(
          415,
          'MEDIA_TYPE_MISMATCH',
          'File content does not match its declared type'
        );
      }
      const key = buildObjectKey({
        prefix: deps.config.pathPrefix,
        businessUnitKey,
        stem: sanitizeFileName(file.originalname),
        ext: extensionFor(sniffed),
        nowMs: now(),
        id: newId(),
      });
      try {
        const stored = await provider.put({
          key,
          body: file.buffer,
          contentType: sniffed,
          ...(title && { title }),
          ...(description && { description }),
        });
        return {
          url: stored.url,
          key: stored.key,
          name: stored.key.slice(stored.key.lastIndexOf('/') + 1),
          size: stored.size,
          contentType: stored.contentType,
        };
      } catch (err) {
        if (err instanceof MediaError) throw err;
        getLogger().error('media.upload.failed', {
          provider: provider.id,
          reason: err instanceof Error ? err.name : 'Error',
        });
        throw new MediaError(
          502,
          'MEDIA_STORAGE_UNAVAILABLE',
          'Media storage is unavailable'
        );
      }
    },

    /**
     * Returns up to `limit` matching files plus a cursor. When an extension filter is set, each provider page (at
     * most `limit` objects) is filtered and appended, so the response can hold up to `2 * limit - 1` files. The
     * collected files are never trimmed: trimming would make the returned cursor skip the files that were cut.
     */
    async list({ businessUnitKey, limit: rawLimit, cursor, extensions }) {
      const provider = await requireProvider();
      assertBusinessUnitKey(businessUnitKey);
      const limit = parseLimit(rawLimit);
      const exts = parseExtensions(extensions);
      const ext = exts.join(',');
      let token: string | null = cursor
        ? decodeCursor(cursor, { bu: businessUnitKey, ext })
        : null;
      const prefix = listPrefix(deps.config.pathPrefix, businessUnitKey);
      const files: MediaFile[] = [];
      try {
        for (let i = 0; i < MAX_SCAN_PAGES; i++) {
          const page = await provider.list({
            prefix,
            limit,
            ...(token !== null && { cursor: token }),
          });
          for (const f of page.files) {
            if (exts.length === 0 || exts.includes(extensionOf(f.key))) {
              files.push({
                ...f,
                isImage:
                  f.isImage ||
                  (f.contentType !== undefined && isImageMime(f.contentType)) ||
                  IMAGE_EXTENSIONS.includes(extensionOf(f.key)),
              });
            }
          }
          token = page.nextCursor;
          if (files.length >= limit || token === null) break;
        }
      } catch (err) {
        if (err instanceof MediaError) throw err;
        getLogger().error('media.list.failed', {
          provider: provider.id,
          reason: err instanceof Error ? err.name : 'Error',
        });
        throw new MediaError(
          502,
          'MEDIA_STORAGE_UNAVAILABLE',
          'Media storage is unavailable'
        );
      }
      const nextCursor =
        token === null
          ? null
          : encodeCursor({ bu: businessUnitKey, ext, t: token });
      return {
        files,
        pagination: { limit, nextCursor, hasMore: nextCursor !== null },
      };
    },
  };
}
