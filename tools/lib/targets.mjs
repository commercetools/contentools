/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** The four buildable trees. `pm` picks the package manager used to run their scripts (owner decision: all Yarn). */
export const TARGETS = [
  { name: 'puck', dir: 'puck', pm: 'yarn' },       // Yarn 4 workspace, published to npm
  // Owner decision: Yarn everywhere (service, mcp, admin-app = Yarn 1 classic with a committed yarn.lock; puck = Yarn 4.5.1).
  { name: 'service', dir: 'service', pm: 'yarn' },     // Connect app
  { name: 'mcp', dir: 'mcp', pm: 'yarn' },             // Connect app
  { name: 'admin-app', dir: 'admin-app', pm: 'yarn' }, // Connect app (Merchant Center custom application)
];
