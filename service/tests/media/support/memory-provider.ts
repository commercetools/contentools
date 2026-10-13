/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  ListInput,
  ListPage,
  PutInput,
  StorageProvider,
  StoredObject,
} from '../../../src/media/types';

export interface MemoryProvider extends StorageProvider {
  readonly objects: Map<string, PutInput>;
  readonly calls: string[];
  failPutWith(error: Error): void;
}

/** In-memory provider: keys sort ascending, cursor is the numeric offset as a string. */
export function createMemoryProvider(): MemoryProvider {
  const objects = new Map<string, PutInput>();
  const calls: string[] = [];
  let putError: Error | undefined;
  return {
    id: 'gcp',
    objects,
    calls,
    failPutWith(error) {
      putError = error;
    },
    async put(input: PutInput): Promise<StoredObject> {
      calls.push('put');
      if (putError) throw putError;
      objects.set(input.key, input);
      return {
        key: input.key,
        url: `https://media.test/${input.key}`,
        size: input.body.length,
        contentType: input.contentType,
      };
    },
    async list(input: ListInput): Promise<ListPage> {
      calls.push('list');
      const keys = [...objects.keys()]
        .filter((k) => k.startsWith(input.prefix))
        .sort();
      const start = input.cursor ? Number(input.cursor) : 0;
      const slice = keys.slice(start, start + input.limit);
      const end = start + slice.length;
      return {
        files: slice.map((key) => {
          const o = objects.get(key) as PutInput;
          return {
            key,
            url: `https://media.test/${key}`,
            name: key.slice(key.lastIndexOf('/') + 1),
            isImage: o.contentType.startsWith('image/'),
            contentType: o.contentType,
            size: o.body.length,
            ...(o.title && { title: o.title }),
          };
        }),
        nextCursor: end < keys.length ? String(end) : null,
      };
    },
    async remove(key: string): Promise<void> {
      calls.push('remove');
      objects.delete(key);
    },
    async checkConnectivity(): Promise<void> {
      calls.push('check');
    },
  };
}
