/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { MediaConfig } from './config';
import type { StorageProvider } from './types';

/** Builds the SDK client on demand; `none` returns null ("not configured"). */
export async function createStorageProvider(
  cfg: MediaConfig
): Promise<StorageProvider | null> {
  switch (cfg.provider) {
    case 'none':
      return null;
    case 'aws':
      return (await import('./providers/aws.provider')).createAwsProvider(cfg);
    case 'gcp':
      return (await import('./providers/gcp.provider')).createGcpProvider(cfg);
    case 'cloudinary':
      return (
        await import('./providers/cloudinary.provider')
      ).createCloudinaryProvider(cfg);
  }
}
