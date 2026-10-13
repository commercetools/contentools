/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { AwsMediaConfig } from '../config';
import { mapLimit } from '../concurrency';
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

const HEAD_CONCURRENCY = 8;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'];

const decode = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export async function createAwsProvider(
  cfg: AwsMediaConfig
): Promise<StorageProvider> {
  const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
  } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: cfg.region,
    ...(cfg.endpoint && { endpoint: cfg.endpoint }),
    forcePathStyle: cfg.endpoint !== null,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const providerUrl = (key: string): string =>
    cfg.endpoint
      ? `${cfg.endpoint}/${cfg.bucket}/${key}`
      : `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
  const urlFor = (key: string): string =>
    publicUrl(cfg.publicBaseUrl, providerUrl(key), key);

  return {
    id: 'aws',

    async put(input: PutInput): Promise<StoredObject> {
      const metadata: Record<string, string> = {};
      if (input.title) metadata.title = encodeURIComponent(input.title);
      if (input.description) {
        metadata.description = encodeURIComponent(input.description);
      }
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
          ...(Object.keys(metadata).length > 0 && { Metadata: metadata }),
        })
      );
      return {
        key: input.key,
        url: urlFor(input.key),
        size: input.body.length,
        contentType: input.contentType,
      };
    },

    async list(input: ListInput): Promise<ListPage> {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: cfg.bucket,
          Prefix: input.prefix,
          MaxKeys: input.limit,
          ...(input.cursor && { ContinuationToken: input.cursor }),
        })
      );
      const objects = (page.Contents ?? []).filter(
        (o) => o.Key !== undefined && !o.Key.endsWith('/')
      );
      const files = await mapLimit(
        objects,
        HEAD_CONCURRENCY,
        async (o): Promise<MediaFile> => {
          const key = o.Key as string;
          const name = key.slice(key.lastIndexOf('/') + 1);
          const ext = name.includes('.')
            ? name.slice(name.lastIndexOf('.') + 1).toLowerCase()
            : '';
          const base: MediaFile = {
            key,
            url: urlFor(key),
            name,
            isImage: IMAGE_EXTENSIONS.includes(ext),
            ...(o.Size !== undefined && { size: o.Size }),
            ...(o.LastModified && { createdAt: o.LastModified.toISOString() }),
          };
          try {
            const head = await client.send(
              new HeadObjectCommand({ Bucket: cfg.bucket, Key: key })
            );
            const title = decode(head.Metadata?.title);
            const description = decode(head.Metadata?.description);
            return {
              ...base,
              ...(head.ContentType && {
                contentType: head.ContentType,
                isImage: isImageMime(head.ContentType) || base.isImage,
              }),
              ...(title !== undefined && { title }),
              ...(description !== undefined && { description }),
            };
          } catch {
            return base;
          }
        }
      );
      return {
        files,
        nextCursor: page.IsTruncated
          ? (page.NextContinuationToken ?? null)
          : null,
      };
    },

    async remove(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })
      );
    },

    async checkConnectivity(): Promise<void> {
      try {
        await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
      } catch (err) {
        throw new StorageUnavailableError(
          'aws',
          err instanceof Error ? err.name : 'Error'
        );
      }
    },
  };
}
