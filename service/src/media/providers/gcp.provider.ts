/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { GcpMediaConfig } from '../config';
import { StorageUnavailableError } from '../errors';
import { isImageMime } from '../mime';
import { publicUrl } from '../public-url';
import type {
  ListInput,
  ListPage,
  MediaFile,
  PutInput,
  StorageProvider,
  StoredObject,
} from '../types';

interface GcsMetadata {
  size?: string | number;
  timeCreated?: string;
  contentType?: string;
  metadata?: { title?: string; description?: string };
}

const reasonOf = (err: unknown): string => {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: unknown; name?: unknown };
    if (e.code !== undefined) return String(e.code);
    if (typeof e.name === 'string') return e.name;
  }
  return 'Error';
};

const isUniformAccessError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: unknown }).code === 400 &&
  /uniform bucket-level access/i.test(String((err as Error).message));

export async function createGcpProvider(
  cfg: GcpMediaConfig
): Promise<StorageProvider> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({
    ...(cfg.serviceAccount.project_id && {
      projectId: cfg.serviceAccount.project_id,
    }),
    credentials: {
      client_email: cfg.serviceAccount.client_email,
      private_key: cfg.serviceAccount.private_key,
    },
  });
  const bucket = storage.bucket(cfg.bucket);
  const urlFor = (key: string): string =>
    publicUrl(
      cfg.publicBaseUrl,
      `https://storage.googleapis.com/${cfg.bucket}/${key}`,
      key
    );

  return {
    id: 'gcp',

    async put(input: PutInput): Promise<StoredObject> {
      const custom: Record<string, string> = {};
      if (input.title) custom.title = input.title;
      if (input.description) custom.description = input.description;
      const options = {
        resumable: false,
        contentType: input.contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
          ...(Object.keys(custom).length > 0 && { metadata: custom }),
        },
      };
      const file = bucket.file(input.key);
      try {
        // Objects are served from their public URL, so make each one publicly readable.
        await file.save(input.body, { ...options, public: true });
      } catch (err) {
        // A bucket with uniform bucket-level access rejects per-object ACLs: access is then governed by the
        // bucket's IAM policy (allUsers as objectViewer), so store the object without the flag.
        if (!isUniformAccessError(err)) throw err;
        await file.save(input.body, options);
      }
      return {
        key: input.key,
        url: urlFor(input.key),
        size: input.body.length,
        contentType: input.contentType,
      };
    },

    async list(input: ListInput): Promise<ListPage> {
      const [files, next] = await bucket.getFiles({
        prefix: input.prefix,
        maxResults: input.limit,
        autoPaginate: false,
        ...(input.cursor && { pageToken: input.cursor }),
      });
      const mapped: MediaFile[] = [];
      for (const file of files) {
        if (file.name.endsWith('/')) continue;
        const meta = file.metadata as GcsMetadata;
        const ext = file.name.includes('.')
          ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
          : '';
        const size = meta.size === undefined ? undefined : Number(meta.size);
        mapped.push({
          key: file.name,
          url: urlFor(file.name),
          name: file.name.slice(file.name.lastIndexOf('/') + 1),
          isImage:
            (meta.contentType !== undefined && isImageMime(meta.contentType)) ||
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext),
          ...(meta.metadata?.title !== undefined && {
            title: meta.metadata.title,
          }),
          ...(meta.metadata?.description !== undefined && {
            description: meta.metadata.description,
          }),
          ...(meta.timeCreated && { createdAt: meta.timeCreated }),
          ...(size !== undefined && Number.isFinite(size) && { size }),
          ...(meta.contentType && { contentType: meta.contentType }),
        });
      }
      const token = (next as { pageToken?: string } | null | undefined)
        ?.pageToken;
      return { files: mapped, nextCursor: token ?? null };
    },

    async remove(key: string): Promise<void> {
      await bucket.file(key).delete({ ignoreNotFound: true });
    },

    async checkConnectivity(): Promise<void> {
      try {
        await bucket.getFiles({ maxResults: 1, autoPaginate: false });
      } catch (err) {
        throw new StorageUnavailableError('gcp', reasonOf(err));
      }
    },
  };
}
