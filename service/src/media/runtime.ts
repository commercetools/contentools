/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { loadMediaConfig, type MediaConfig } from './config';
import { createMediaService, type MediaService } from './media.service';
import { createStorageProvider } from './provider-factory';
import type { StorageProvider } from './types';

export interface MediaRuntime {
  config: MediaConfig;
  getProvider: () => Promise<StorageProvider | null>;
  service: MediaService;
}

/** Validates the configuration now; builds the SDK client only on the first `getProvider()` call. */
export function createMediaRuntime(
  env: Record<string, string | undefined>
): MediaRuntime {
  const config = loadMediaConfig(env);
  let provider: Promise<StorageProvider | null> | undefined;
  const getProvider = (): Promise<StorageProvider | null> => {
    provider ??= createStorageProvider(config).catch((err: unknown) => {
      provider = undefined;
      throw err;
    });
    return provider;
  };
  return {
    config,
    getProvider,
    service: createMediaService({ config, getProvider }),
  };
}
