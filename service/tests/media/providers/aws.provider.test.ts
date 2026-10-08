/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import type { AwsMediaConfig } from '../../../src/media/config';
import { createAwsProvider } from '../../../src/media/providers/aws.provider';
import {
  describeStorageProviderContract,
  type ProviderHarness,
} from '../support/provider-contract';

const cfg: AwsMediaConfig = {
  provider: 'aws',
  bucket: 'media-bucket',
  region: 'eu-west-1',
  endpoint: null,
  accessKeyId: 'AKIA-TEST',
  secretAccessKey: 'test-secret',
  pathPrefix: 'contentools/media',
  maxUploadBytes: 1024 * 1024,
  allowedMimeTypes: new Set(['image/png']),
  publicBaseUrl: null,
};

interface Stored {
  body?: unknown;
  contentType?: string;
  metadata?: Record<string, string>;
}

const s3 = mockClient(S3Client);
const store = new Map<string, Stored>();
let failHead: string | undefined;
let connectivityError: Error | undefined;

function install(): void {
  s3.reset();
  store.clear();
  failHead = undefined;
  connectivityError = undefined;
  s3.on(PutObjectCommand).callsFake((input) => {
    store.set(input.Key, {
      body: input.Body,
      contentType: input.ContentType,
      metadata: input.Metadata,
    });
    return {};
  });
  s3.on(ListObjectsV2Command).callsFake((input) => {
    const keys = [...store.keys()]
      .filter((k) => k.startsWith(input.Prefix ?? ''))
      .sort();
    const start = input.ContinuationToken ? Number(input.ContinuationToken) : 0;
    const slice = keys.slice(start, start + (input.MaxKeys ?? 1000));
    const end = start + slice.length;
    return {
      Contents: slice.map((Key) => ({
        Key,
        Size: 8,
        LastModified: new Date('2026-01-01T00:00:00Z'),
      })),
      IsTruncated: end < keys.length,
      NextContinuationToken: end < keys.length ? String(end) : undefined,
    };
  });
  s3.on(HeadObjectCommand).callsFake((input) => {
    if (input.Key === failHead) throw new Error('boom');
    const o = store.get(input.Key);
    return { ContentType: o?.contentType, Metadata: o?.metadata };
  });
  s3.on(DeleteObjectCommand).callsFake((input) => {
    store.delete(input.Key);
    return {};
  });
  s3.on(HeadBucketCommand).callsFake(() => {
    if (connectivityError) throw connectivityError;
    return {};
  });
}

const makeHarness = async (): Promise<ProviderHarness> => {
  install();
  const provider = await createAwsProvider(cfg);
  return {
    provider,
    async seed(keys) {
      for (const Key of keys) store.set(Key, { contentType: 'image/png' });
    },
    calls: () => ({
      list: s3.commandCalls(ListObjectsV2Command).length,
      perObject: s3.commandCalls(HeadObjectCommand).length,
    }),
    failConnectivity(secret) {
      const err = new Error(`bucket media-bucket denied for ${secret}`);
      err.name = 'AccessDenied';
      connectivityError = err;
    },
  };
};

describeStorageProviderContract('aws', makeHarness);

describe('aws provider specifics', () => {
  it('never sends an ACL and percent-encodes metadata', async () => {
    const h = await makeHarness();
    await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'Café',
      description: 'd é',
    });
    const input = s3.commandCalls(PutObjectCommand)[0]?.args[0].input;
    expect(input).not.toHaveProperty('ACL');
    expect(input?.Metadata?.title).toBe('Caf%C3%A9');
    expect(input?.CacheControl).toContain('immutable');
  });

  it('lists a page with one list call, at most one head per key and no get', async () => {
    const h = await makeHarness();
    await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'Café',
    });
    await h.seed(
      Array.from(
        { length: 19 },
        (_, i) => `p/a/k${String(i).padStart(2, '0')}.png`
      )
    );
    const page = await h.provider.list({ prefix: 'p/a/', limit: 20 });
    expect(page.files).toHaveLength(20);
    expect(s3.commandCalls(ListObjectsV2Command)).toHaveLength(1);
    expect(s3.commandCalls(HeadObjectCommand).length).toBeLessThanOrEqual(20);
    expect(s3.commandCalls(GetObjectCommand)).toHaveLength(0);
    expect(page.files.find((f) => f.key === 'p/a/1.png')?.title).toBe('Café');
  });

  it('one failing head still returns the file', async () => {
    const h = await makeHarness();
    await h.seed(['p/a/1.png', 'p/a/2.png']);
    failHead = 'p/a/1.png';
    const page = await h.provider.list({ prefix: 'p/a/', limit: 10 });
    expect(page.files.map((f) => f.key)).toEqual(['p/a/1.png', 'p/a/2.png']);
  });

  it('builds path-style urls for a custom endpoint and honors the public base url', async () => {
    install();
    const custom = await createAwsProvider({
      ...cfg,
      endpoint: 'http://localhost:9000',
    });
    const a = await custom.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    });
    expect(a.url).toBe('http://localhost:9000/media-bucket/p/a/1.png');
    const cdn = await createAwsProvider({
      ...cfg,
      publicBaseUrl: 'https://cdn.example.com',
    });
    const b = await cdn.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    });
    expect(b.url).toBe('https://cdn.example.com/p/a/1.png');
    const std = await createAwsProvider(cfg);
    const c = await std.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    });
    expect(c.url).toBe(
      'https://media-bucket.s3.eu-west-1.amazonaws.com/p/a/1.png'
    );
  });
});
