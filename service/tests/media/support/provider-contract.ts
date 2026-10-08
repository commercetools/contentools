/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { StorageUnavailableError } from '../../../src/media/errors';
import type { StorageProvider } from '../../../src/media/types';

export interface ProviderHarness {
  provider: StorageProvider;
  /** Makes the backend contain these keys (as small PNG objects). */
  seed(keys: string[]): Promise<void>;
  calls(): { list: number; perObject: number };
  /** Makes the next connectivity check fail with an SDK error whose message contains `secret`. */
  failConnectivity(secret: string): void;
}

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

export function describeStorageProviderContract(
  name: string,
  makeHarness: () => Promise<ProviderHarness>
): void {
  describe(`StorageProvider contract: ${name}`, () => {
    let h: ProviderHarness;
    beforeEach(async () => {
      h = await makeHarness();
    });

    it('stores an object and returns its key, url, size and type', async () => {
      const stored = await h.provider.put({
        key: 'p/a/1.png',
        body: PNG,
        contentType: 'image/png',
      });
      expect(stored.key).toBe('p/a/1.png');
      expect(stored.url).toContain('p/a/1');
      expect(stored.size).toBe(PNG.length);
      expect(stored.contentType).toBe('image/png');
    });

    it('lists only the requested prefix', async () => {
      await h.seed(['p/a/1.png', 'p/ab/2.png']);
      const page = await h.provider.list({ prefix: 'p/a/', limit: 10 });
      expect(page.files.map((f) => f.key)).toEqual(['p/a/1.png']);
      expect(page.nextCursor).toBeNull();
    });

    it('pages 5 objects with limit 2 as 2, 2, 1', async () => {
      await h.seed([
        'p/a/1.png',
        'p/a/2.png',
        'p/a/3.png',
        'p/a/4.png',
        'p/a/5.png',
      ]);
      const sizes: number[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 5; i++) {
        const page = await h.provider.list({
          prefix: 'p/a/',
          limit: 2,
          ...(cursor && { cursor }),
        });
        sizes.push(page.files.length);
        if (page.nextCursor === null) break;
        cursor = page.nextCursor;
      }
      expect(sizes).toEqual([2, 2, 1]);
    });

    it('lists a page without per-object round trips beyond the documented ones', async () => {
      await h.seed(['p/a/1.png', 'p/a/2.png']);
      await h.provider.list({ prefix: 'p/a/', limit: 10 });
      expect(h.calls().list).toBe(1);
    });

    it('removing a missing key resolves', async () => {
      await expect(h.provider.remove('p/a/none.png')).resolves.toBeUndefined();
    });

    it('connectivity check resolves when the backend is reachable', async () => {
      await expect(h.provider.checkConnectivity()).resolves.toBeUndefined();
    });

    it('connectivity failure carries the provider id and no credential text', async () => {
      const secret = 'SUPER-SECRET-VALUE-123';
      h.failConnectivity(secret);
      const error = await h.provider.checkConnectivity().then(
        () => undefined,
        (e: unknown) => e
      );
      expect(error).toBeInstanceOf(StorageUnavailableError);
      const e = error as StorageUnavailableError;
      expect(e.provider).toBe(h.provider.id);
      expect(e.message).not.toContain(secret);
      expect(e.reason).not.toContain(secret);
    });
  });
}
