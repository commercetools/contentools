/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineConfig } from 'vitest/config';

/** Shared vitest config for every puck package: `import shared from '../../vitest.shared'; export default shared;`. */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Resolved against the package root (packages/<name>), so ../../ is the puck workspace root.
    setupFiles: ['../../vitest.setup.ts'],
    restoreMocks: true,
  },
});
