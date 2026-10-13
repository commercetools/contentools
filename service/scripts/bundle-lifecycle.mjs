/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { build } from 'esbuild';

// The lifecycle scripts run without node_modules, so everything is bundled.
await build({
  entryPoints: [
    'src/connector/post-deploy.ts',
    'src/connector/pre-undeploy.ts',
  ],
  outdir: process.argv[2] ?? 'build/connector',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: 'linked',
  logLevel: 'info',
});
