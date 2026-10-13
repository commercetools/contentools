/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Writable } from 'node:stream';
import type { CloudinaryMediaConfig } from '../../../src/media/config';
import { createCloudinaryProvider } from '../../../src/media/providers/cloudinary.provider';
import {
  describeStorageProviderContract,
  type ProviderHarness,
} from '../support/provider-contract';

interface Resource {
  public_id: string;
  format: string;
  secure_url: string;
  bytes: number;
  created_at: string;
  context?: { custom: Record<string, string> };
}

const state = {
  resources: new Map<string, Resource>(),
  uploadOptions: [] as Array<Record<string, unknown>>,
  resourcesCalls: [] as Array<Record<string, unknown>>,
  resourceCalls: 0,
  pingError: undefined as (Error & { http_code?: number }) | undefined,
};

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: (
        options: Record<string, unknown>,
        cb: (e: unknown, r?: unknown) => void
      ): Writable => {
        state.uploadOptions.push(options);
        return new Writable({
          write(chunk: Buffer, _enc, done): void {
            const id = options.public_id as string;
            const ctx = options.context as Record<string, string> | undefined;
            state.resources.set(id, {
              public_id: id,
              format: 'png',
              secure_url: `https://res.cloudinary.test/image/upload/${id}.png`,
              bytes: chunk.length,
              created_at: '2026-01-01T00:00:00Z',
              ...(ctx && { context: { custom: ctx } }),
            });
            done();
            cb(null, state.resources.get(id));
          },
        });
      },
      destroy: async (id: string): Promise<{ result: string }> => {
        state.resources.delete(id);
        return { result: 'ok' };
      },
    },
    api: {
      resources: async (opts: {
        prefix: string;
        max_results: number;
        next_cursor?: string;
      }) => {
        state.resourcesCalls.push(opts);
        const all = [...state.resources.values()]
          .filter((r) => r.public_id.startsWith(opts.prefix))
          .sort((a, b) => a.public_id.localeCompare(b.public_id));
        const start = opts.next_cursor ? Number(opts.next_cursor) : 0;
        const slice = all.slice(start, start + opts.max_results);
        const end = start + slice.length;
        return {
          resources: slice,
          ...(end < all.length && { next_cursor: String(end) }),
        };
      },
      resource: async (): Promise<void> => {
        state.resourceCalls++;
      },
      ping: async (): Promise<void> => {
        if (state.pingError) throw state.pingError;
      },
    },
  },
}));

const cfg: CloudinaryMediaConfig = {
  provider: 'cloudinary',
  cloudName: 'test-cloud',
  apiKey: 'key',
  apiSecret: 'secret',
  pathPrefix: 'contentools/media',
  maxUploadBytes: 1024 * 1024,
  allowedMimeTypes: new Set(['image/png']),
  publicBaseUrl: null,
};

const makeHarness = async (): Promise<ProviderHarness> => {
  state.resources.clear();
  state.uploadOptions = [];
  state.resourcesCalls = [];
  state.resourceCalls = 0;
  state.pingError = undefined;
  const provider = await createCloudinaryProvider(cfg);
  return {
    provider,
    async seed(keys) {
      for (const k of keys) {
        const id = k.replace(/\.png$/, '');
        state.resources.set(id, {
          public_id: id,
          format: 'png',
          secure_url: `https://res.cloudinary.test/image/upload/${id}.png`,
          bytes: 8,
          created_at: '2026-01-01T00:00:00Z',
        });
      }
    },
    calls: () => ({
      list: state.resourcesCalls.length,
      perObject: state.resourceCalls,
    }),
    failConnectivity(secret) {
      const err = new Error(`cloud test-cloud ${secret}`) as Error & {
        http_code?: number;
      };
      err.http_code = 401;
      state.pingError = err;
    },
  };
};

describeStorageProviderContract('cloudinary', makeHarness);

describe('cloudinary provider specifics', () => {
  it('passes title and description as a context object', async () => {
    const h = await makeHarness();
    const stored = await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'a|b=c',
    });
    expect(state.uploadOptions[0]).toMatchObject({
      public_id: 'p/a/1',
      resource_type: 'image',
      overwrite: false,
      context: { title: 'a|b=c' },
    });
    expect(stored.key).toBe('p/a/1.png');
    expect(stored.url).toContain('res.cloudinary.test');
  });

  it('lists with one resources call asking for context and no per-resource call', async () => {
    const h = await makeHarness();
    await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'T',
    });
    const page = await h.provider.list({ prefix: 'p/a/', limit: 10 });
    expect(state.resourcesCalls).toHaveLength(1);
    expect(state.resourcesCalls[0]).toMatchObject({
      context: true,
      prefix: 'p/a/',
    });
    expect(state.resourceCalls).toBe(0);
    expect(page.files[0]).toMatchObject({
      key: 'p/a/1.png',
      title: 'T',
      isImage: true,
    });
  });
});
