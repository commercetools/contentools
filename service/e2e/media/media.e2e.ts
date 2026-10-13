/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createMediaRuntime } from '../../src/media/runtime';

/**
 * Live media check. Skipped unless E2E_MEDIA_PROVIDER is set (gcp | aws | cloudinary).
 * Provider keys are read from E2E_MEDIA_* variables (same names as the MEDIA_* keys, with the E2E_ prefix).
 * Only writes below the `contentools-test/` prefix and removes everything it wrote. Never prints values.
 */
const provider = process.env.E2E_MEDIA_PROVIDER;
const run = provider ? describe : describe.skip;

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082',
  'hex'
);

function mediaEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('E2E_MEDIA_')) env[name.replace('E2E_', '')] = value;
  }
  env.MEDIA_STORAGE_PROVIDER = provider;
  env.MEDIA_PATH_PREFIX = 'contentools-test/media';
  return env;
}

run('media live check', () => {
  const written: string[] = [];
  const bu = `e2e-${Date.now().toString(36)}`;
  const runtime = (() => {
    const env = mediaEnv();
    if (!env.MEDIA_PATH_PREFIX?.startsWith('contentools-test/')) {
      throw new Error('e2e: refusing to run outside the contentools-test/ prefix');
    }
    return createMediaRuntime(env);
  })();

  afterAll(async () => {
    const p = await runtime.getProvider();
    for (const key of written) await p?.remove(key);
  });

  it('checks connectivity, uploads, serves the bytes publicly and lists newest first', async () => {
    const p = await runtime.getProvider();
    expect(p).not.toBeNull();
    await expect(p?.checkConnectivity()).resolves.toBeUndefined();

    const first = await runtime.service.upload({
      businessUnitKey: bu,
      file: { buffer: PNG, originalname: 'First Image.png', mimetype: 'image/png' },
      title: 'First',
    });
    written.push(first.key);
    await new Promise((r) => setTimeout(r, 25));
    const second = await runtime.service.upload({
      businessUnitKey: bu,
      file: { buffer: PNG, originalname: 'second.png', mimetype: 'image/png' },
    });
    written.push(second.key);

    expect(first.key.startsWith(`contentools-test/media/${bu}/`)).toBe(true);

    const res = await fetch(first.url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);

    const all = await runtime.service.list({ businessUnitKey: bu });
    expect(all.files.map((f) => f.key)).toEqual([second.key, first.key]);
    expect(all.files[1]?.title).toBe('First');

    const one = await runtime.service.list({ businessUnitKey: bu, limit: 1 });
    expect(one.files).toHaveLength(1);
    expect(one.pagination.hasMore).toBe(true);
    const next = await runtime.service.list({
      businessUnitKey: bu,
      limit: 1,
      cursor: one.pagination.nextCursor as string,
    });
    expect(next.files.map((f) => f.key)).toEqual([first.key]);
    expect(next.pagination.hasMore).toBe(false);
  });
});
