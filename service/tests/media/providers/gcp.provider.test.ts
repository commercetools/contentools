import type { GcpMediaConfig } from '../../../src/media/config';
import { createGcpProvider } from '../../../src/media/providers/gcp.provider';
import {
  describeStorageProviderContract,
  type ProviderHarness,
} from '../support/provider-contract';

interface FakeObject {
  contentType?: string;
  metadata?: Record<string, unknown>;
  size: number;
}

const state = {
  objects: new Map<string, FakeObject>(),
  saveOptions: [] as Array<Record<string, unknown>>,
  getFilesCalls: 0,
  getMetadataCalls: 0,
  connectivityError: undefined as Error | undefined,
  saveError: undefined as (Error & { code?: number }) | undefined,
};

jest.mock('@google-cloud/storage', () => {
  class FakeFile {
    constructor(readonly name: string) {}
    get metadata(): Record<string, unknown> {
      const o = state.objects.get(this.name);
      return {
        size: String(o?.size ?? 0),
        timeCreated: '2026-01-01T00:00:00.000Z',
        contentType: o?.contentType,
        metadata: o?.metadata,
      };
    }
    async save(body: Buffer, options: Record<string, unknown>): Promise<void> {
      state.saveOptions.push(options);
      if (options.public && state.saveError) throw state.saveError;
      const meta = options.metadata as
        { metadata?: Record<string, unknown> } | undefined;
      state.objects.set(this.name, {
        contentType: options.contentType as string,
        metadata: meta?.metadata,
        size: body.length,
      });
    }
    async delete(): Promise<void> {
      state.objects.delete(this.name);
    }
    async getMetadata(): Promise<void> {
      state.getMetadataCalls++;
    }
  }
  class FakeBucket {
    file(name: string): FakeFile {
      return new FakeFile(name);
    }
    async getFiles(q: {
      prefix?: string;
      maxResults?: number;
      pageToken?: string;
    }): Promise<[FakeFile[], { pageToken: string } | null]> {
      state.getFilesCalls++;
      if (state.connectivityError) throw state.connectivityError;
      const keys = [...state.objects.keys()]
        .filter((k) => k.startsWith(q.prefix ?? ''))
        .sort();
      const start = q.pageToken ? Number(q.pageToken) : 0;
      const slice = keys.slice(start, start + (q.maxResults ?? 1000));
      const end = start + slice.length;
      return [
        slice.map((k) => new FakeFile(k)),
        end < keys.length ? { pageToken: String(end) } : null,
      ];
    }
  }
  class Storage {
    bucket(): FakeBucket {
      return new FakeBucket();
    }
  }
  return { Storage };
});

const cfg: GcpMediaConfig = {
  provider: 'gcp',
  bucket: 'media-bucket',
  serviceAccount: {
    client_email: 'svc@example.test',
    private_key: 'k',
    project_id: 'p',
  },
  pathPrefix: 'contentools/media',
  maxUploadBytes: 1024 * 1024,
  allowedMimeTypes: new Set(['image/png']),
  publicBaseUrl: null,
};

const makeHarness = async (): Promise<ProviderHarness> => {
  state.objects.clear();
  state.saveOptions = [];
  state.saveError = undefined;
  state.getFilesCalls = 0;
  state.getMetadataCalls = 0;
  state.connectivityError = undefined;
  const provider = await createGcpProvider(cfg);
  return {
    provider,
    async seed(keys) {
      for (const k of keys)
        state.objects.set(k, { contentType: 'image/png', size: 8 });
    },
    calls: () => ({
      list: state.getFilesCalls,
      perObject: state.getMetadataCalls,
    }),
    failConnectivity(secret) {
      const err = new Error(`bucket media-bucket ${secret}`) as Error & {
        code: number;
      };
      err.code = 403;
      state.connectivityError = err;
    },
  };
};

describeStorageProviderContract('gcp', makeHarness);

describe('gcp provider specifics', () => {
  it('retries without the public flag on a uniform bucket-level access bucket', async () => {
    const h = await makeHarness();
    state.saveError = Object.assign(
      new Error(
        'Cannot insert legacy ACL for an object when uniform bucket-level access is enabled.'
      ),
      { code: 400 }
    );
    await h.provider.put({
      key: 'p/a/2.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    });
    expect(state.saveOptions).toHaveLength(2);
    expect(state.saveOptions[0]).toHaveProperty('public', true);
    expect(state.saveOptions[1]).not.toHaveProperty('public');
    expect(state.objects.has('p/a/2.png')).toBe(true);
  });

  it('does not swallow other upload errors', async () => {
    const h = await makeHarness();
    state.saveError = Object.assign(new Error('boom'), { code: 500 });
    await expect(
      h.provider.put({
        key: 'p/a/3.png',
        body: Buffer.from('x'),
        contentType: 'image/png',
      })
    ).rejects.toThrow('boom');
    expect(state.saveOptions).toHaveLength(1);
  });

  it('makes the object public and stores custom metadata', async () => {
    const h = await makeHarness();
    const stored = await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'T',
    });
    expect(state.saveOptions[0]).toMatchObject({
      public: true,
      resumable: false,
      contentType: 'image/png',
    });
    expect(state.objects.get('p/a/1.png')?.metadata).toEqual({ title: 'T' });
    expect(stored.url).toBe(
      'https://storage.googleapis.com/media-bucket/p/a/1.png'
    );
  });

  it('lists with exactly one getFiles call and no metadata round trips', async () => {
    const h = await makeHarness();
    await h.provider.put({
      key: 'p/a/1.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
      title: 'T',
    });
    const page = await h.provider.list({ prefix: 'p/a/', limit: 10 });
    expect(state.getFilesCalls).toBe(1);
    expect(state.getMetadataCalls).toBe(0);
    expect(page.files[0]).toMatchObject({
      title: 'T',
      isImage: true,
      contentType: 'image/png',
      size: 1,
    });
  });

  it('reports the error code only on connectivity failure', async () => {
    const h = await makeHarness();
    h.failConnectivity('x');
    await expect(h.provider.checkConnectivity()).rejects.toMatchObject({
      provider: 'gcp',
      reason: '403',
    });
  });
});
