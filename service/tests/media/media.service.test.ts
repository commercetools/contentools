/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { loadMediaConfig } from '../../src/media/config';
import { createMediaService } from '../../src/media/media.service';
import {
  createMemoryProvider,
  type MemoryProvider,
} from './support/memory-provider';
import { PNG } from './support/png';

const JPEG = Buffer.from('ffd8ffe000104a464946', 'hex');

function setup(env: Record<string, string> = {}): {
  provider: MemoryProvider;
  service: ReturnType<typeof createMediaService>;
} {
  const provider = createMemoryProvider();
  const service = createMediaService({
    config: loadMediaConfig(env),
    getProvider: async () => provider,
    now: () => 1767225600000,
    newId: () => '1a2b3c4d',
  });
  return { provider, service };
}

const code = (mediaCode: string, status: number): unknown =>
  expect.objectContaining({ mediaCode, statusCode: status });

describe('MediaService.upload', () => {
  const file = {
    buffer: PNG,
    originalname: 'Summer Sale (1).PNG',
    mimetype: 'image/png',
  };

  it('stores a sniffed object under the BU key and returns its description', async () => {
    const { provider, service } = setup();
    const r = await service.upload({
      businessUnitKey: 'main-bu',
      file,
      title: 'Logo',
    });
    expect(r.key).toBe(
      'contentools/media/main-bu/8232774399999-1a2b3c4d-Summer-Sale-1.png'
    );
    expect(r).toMatchObject({
      contentType: 'image/png',
      size: PNG.length,
      name: '8232774399999-1a2b3c4d-Summer-Sale-1.png',
    });
    expect(provider.objects.get(r.key)?.title).toBe('Logo');
  });

  it('answers 501 when no provider is configured', async () => {
    const service = createMediaService({
      config: loadMediaConfig({}),
      getProvider: async () => null,
    });
    await expect(
      service.upload({ businessUnitKey: 'a', file })
    ).rejects.toEqual(code('MEDIA_NOT_CONFIGURED', 501));
    await expect(service.list({ businessUnitKey: 'a' })).rejects.toEqual(
      code('MEDIA_NOT_CONFIGURED', 501)
    );
  });

  it.each([
    ['text/html', Buffer.from('<html>'), 'MEDIA_TYPE_NOT_ALLOWED'],
    ['image/svg+xml', Buffer.from('<svg/>'), 'MEDIA_TYPE_NOT_ALLOWED'],
    ['image/png', Buffer.from('<html>'), 'MEDIA_TYPE_MISMATCH'],
    ['image/png', JPEG, 'MEDIA_TYPE_MISMATCH'],
  ])('rejects declared %s', async (mimetype, buffer, expected) => {
    const { provider, service } = setup();
    await expect(
      service.upload({
        businessUnitKey: 'a',
        file: { buffer, originalname: 'x.png', mimetype },
      })
    ).rejects.toEqual(code(expected, 415));
    expect(provider.calls).toEqual([]);
  });

  it('allows SVG only when listed', async () => {
    const { service } = setup({ MEDIA_ALLOWED_MIME_TYPES: 'image/svg+xml' });
    const r = await service.upload({
      businessUnitKey: 'a',
      file: {
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        originalname: 'i.svg',
        mimetype: 'image/svg+xml',
      },
    });
    expect(r.contentType).toBe('image/svg+xml');
  });

  it('honors a restricted allowlist', async () => {
    const { service } = setup({ MEDIA_ALLOWED_MIME_TYPES: 'image/png' });
    await expect(
      service.upload({
        businessUnitKey: 'a',
        file: { buffer: JPEG, originalname: 'x.jpg', mimetype: 'image/jpeg' },
      })
    ).rejects.toEqual(code('MEDIA_TYPE_NOT_ALLOWED', 415));
  });

  it('rejects bad business unit keys and long metadata', async () => {
    const { provider, service } = setup();
    await expect(
      service.upload({ businessUnitKey: 'a..b', file })
    ).rejects.toEqual(code('MEDIA_INVALID_BUSINESS_UNIT', 400));
    await expect(
      service.upload({ businessUnitKey: 'a', file, title: 'x'.repeat(201) })
    ).rejects.toEqual(code('MEDIA_INVALID_METADATA', 400));
    await expect(
      service.upload({
        businessUnitKey: 'a',
        file,
        description: 'x'.repeat(2001),
      })
    ).rejects.toEqual(code('MEDIA_INVALID_METADATA', 400));
    expect(provider.calls).toEqual([]);
  });

  it('maps storage failures to a generic 502', async () => {
    const { provider, service } = setup();
    provider.failPutWith(new Error('bucket secret-bucket denied'));
    const err = await service
      .upload({ businessUnitKey: 'a', file })
      .catch((e: unknown) => e);
    expect(err).toEqual(code('MEDIA_STORAGE_UNAVAILABLE', 502));
    expect((err as Error).message).not.toContain('secret-bucket');
  });
});

describe('MediaService.list', () => {
  async function seeded(
    env: Record<string, string> = {},
    n = 45
  ): Promise<ReturnType<typeof setup>> {
    const s = setup(env);
    for (let i = 0; i < n; i++) {
      const ext = i % 3 === 0 ? 'jpg' : 'png';
      const key = `contentools/media/main/${String(i).padStart(4, '0')}-x.${ext}`;
      await s.provider.put({
        key,
        body: PNG,
        contentType: ext === 'jpg' ? 'image/jpeg' : 'image/png',
      });
    }
    await s.provider.put({
      key: 'contentools/media/mainx/0000-other.png',
      body: PNG,
      contentType: 'image/png',
    });
    s.provider.calls.length = 0;
    return s;
  }

  it('walks 45 objects as 20, 20, 5 and stays inside the BU', async () => {
    const { service } = await seeded();
    const sizes: number[] = [];
    let cursor: string | undefined;
    const flags: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await service.list({
        businessUnitKey: 'main',
        limit: 20,
        cursor,
      });
      sizes.push(r.files.length);
      flags.push(r.pagination.hasMore);
      expect(
        r.files.every((f) => f.key.startsWith('contentools/media/main/'))
      ).toBe(true);
      if (!r.pagination.nextCursor) break;
      cursor = r.pagination.nextCursor;
    }
    expect(sizes).toEqual([20, 20, 5]);
    expect(flags).toEqual([true, true, false]);
  });

  it('filters by extension, scanning at most 5 provider pages, and never trims', async () => {
    const { service, provider } = await seeded();
    const r = await service.list({
      businessUnitKey: 'main',
      limit: 5,
      extensions: '.JPG',
    });
    expect(r.files.length).toBeGreaterThanOrEqual(5);
    expect(r.files.length).toBeLessThanOrEqual(9);
    expect(r.files.every((f) => f.key.endsWith('.jpg'))).toBe(true);
    expect(
      provider.calls.filter((c) => c === 'list').length
    ).toBeLessThanOrEqual(5);
    const next = await service.list({
      businessUnitKey: 'main',
      limit: 5,
      extensions: 'jpg',
      cursor: r.pagination.nextCursor as string,
    });
    expect(next.files.length).toBeGreaterThan(0);
    const first = new Set(r.files.map((f) => f.key));
    expect(next.files.some((f) => first.has(f.key))).toBe(false);
  });

  it('rejects a cursor reused with another BU or another filter', async () => {
    const { service } = await seeded();
    const r = await service.list({ businessUnitKey: 'main', limit: 5 });
    const cursor = r.pagination.nextCursor as string;
    await expect(
      service.list({ businessUnitKey: 'other', cursor })
    ).rejects.toEqual(code('MEDIA_INVALID_CURSOR', 400));
    await expect(
      service.list({ businessUnitKey: 'main', cursor, extensions: 'png' })
    ).rejects.toEqual(code('MEDIA_INVALID_CURSOR', 400));
    await expect(
      service.list({ businessUnitKey: 'main', cursor: 'garbage' })
    ).rejects.toEqual(code('MEDIA_INVALID_CURSOR', 400));
  });

  it('clamps and defaults the limit', async () => {
    const { service } = await seeded({}, 150);
    expect(
      (await service.list({ businessUnitKey: 'main', limit: '1000' }))
        .pagination.limit
    ).toBe(100);
    expect(
      (await service.list({ businessUnitKey: 'main', limit: '0' })).pagination
        .limit
    ).toBe(1);
    expect(
      (await service.list({ businessUnitKey: 'main', limit: 'abc' })).pagination
        .limit
    ).toBe(20);
    expect(
      (await service.list({ businessUnitKey: 'main' })).files
    ).toHaveLength(20);
  });

  it('validates the extension filter', async () => {
    const { service } = await seeded({}, 3);
    for (const bad of [
      'png,../x',
      'a'.repeat(11),
      Array.from({ length: 21 }, (_, i) => `e${i}`).join(','),
    ]) {
      await expect(
        service.list({ businessUnitKey: 'main', extensions: bad })
      ).rejects.toEqual(code('MEDIA_INVALID_EXTENSIONS', 400));
    }
  });

  it('describes files with name, url and image flag', async () => {
    const { service } = await seeded({}, 1);
    const r = await service.list({ businessUnitKey: 'main' });
    expect(r.files[0]).toMatchObject({
      name: '0000-x.jpg',
      isImage: true,
      url: expect.stringContaining('https://'),
    });
  });

  it('maps provider failures to 502 without leaking text', async () => {
    const provider = createMemoryProvider();
    provider.list = async () => {
      throw new Error('bucket secret-bucket exploded');
    };
    const service = createMediaService({
      config: loadMediaConfig({}),
      getProvider: async () => provider,
    });
    const err = await service
      .list({ businessUnitKey: 'a' })
      .catch((e: unknown) => e);
    expect(err).toEqual(code('MEDIA_STORAGE_UNAVAILABLE', 502));
    expect((err as Error).message).not.toContain('secret-bucket');
  });
});
