/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { UploadApiResponse } from 'cloudinary';
import type { CloudinaryMediaConfig } from '../config';
import { StorageUnavailableError } from '../errors';
import { publicUrl } from '../public-url';
import type {
  ListInput,
  ListPage,
  MediaFile,
  PutInput,
  StorageProvider,
  StoredObject,
} from '../types';

interface CloudinaryResource {
  public_id: string;
  format?: string;
  secure_url: string;
  created_at?: string;
  bytes?: number;
  context?: { custom?: { title?: string; description?: string } };
}

const reasonOf = (err: unknown): string => {
  if (typeof err === 'object' && err !== null) {
    const e = err as { http_code?: unknown; name?: unknown };
    if (e.http_code !== undefined) return String(e.http_code);
    if (typeof e.name === 'string') return e.name;
  }
  return 'Error';
};

const withoutExtension = (key: string): string => {
  const slash = key.lastIndexOf('/');
  const dot = key.lastIndexOf('.');
  return dot > slash ? key.slice(0, dot) : key;
};

export async function createCloudinaryProvider(
  cfg: CloudinaryMediaConfig
): Promise<StorageProvider> {
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
    secure: true,
  });

  return {
    id: 'cloudinary',

    async put(input: PutInput): Promise<StoredObject> {
      const context: Record<string, string> = {};
      if (input.title) context.title = input.title;
      if (input.description) context.description = input.description;
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: withoutExtension(input.key),
            resource_type: 'image',
            overwrite: false,
            unique_filename: false,
            use_filename: false,
            invalidate: false,
            ...(Object.keys(context).length > 0 && { context }),
          },
          (error, uploaded) => {
            if (error || !uploaded) reject(error ?? new Error('upload failed'));
            else resolve(uploaded);
          }
        );
        stream.end(input.body);
      });
      const key = `${result.public_id}.${result.format}`;
      return {
        key,
        url: publicUrl(cfg.publicBaseUrl, result.secure_url, key),
        size: input.body.length,
        contentType: input.contentType,
      };
    },

    async list(input: ListInput): Promise<ListPage> {
      const result = (await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        prefix: input.prefix,
        max_results: input.limit,
        context: true,
        ...(input.cursor && { next_cursor: input.cursor }),
      })) as { resources: CloudinaryResource[]; next_cursor?: string };
      const files: MediaFile[] = result.resources.map((r) => {
        const key = r.format ? `${r.public_id}.${r.format}` : r.public_id;
        return {
          key,
          url: publicUrl(cfg.publicBaseUrl, r.secure_url, key),
          name: key.slice(key.lastIndexOf('/') + 1),
          isImage: r.format !== 'pdf',
          ...(r.context?.custom?.title !== undefined && {
            title: r.context.custom.title,
          }),
          ...(r.context?.custom?.description !== undefined && {
            description: r.context.custom.description,
          }),
          ...(r.created_at && { createdAt: r.created_at }),
          ...(r.bytes !== undefined && { size: r.bytes }),
        };
      });
      return { files, nextCursor: result.next_cursor ?? null };
    },

    async remove(key: string): Promise<void> {
      await cloudinary.uploader.destroy(withoutExtension(key), {
        resource_type: 'image',
        invalidate: true,
      });
    },

    async checkConnectivity(): Promise<void> {
      try {
        await cloudinary.api.ping();
      } catch (err) {
        throw new StorageUnavailableError('cloudinary', reasonOf(err));
      }
    },
  };
}
