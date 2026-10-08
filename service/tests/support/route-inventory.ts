/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Express } from 'express';
import { requireAuth } from '../../src/middleware/auth.middleware';

interface Layer {
  name: string;
  handle: { stack?: Layer[] } & ((...args: unknown[]) => unknown);
  route?: { path: string; methods: Record<string, boolean> };
}

export interface RouteInfo {
  method: string;
  path: string;
  access: 'public' | 'protected';
}

/**
 * Lists every route registered under `/service` (Express 4 internals) with
 * its access: routes registered before the auth gate are public, after it protected.
 */
export function listRoutes(app: Express): RouteInfo[] {
  const root = (app as unknown as { _router: { stack: Layer[] } })._router.stack;
  const service = root.find(
    (l) =>
      l.name === 'router' &&
      l.handle.stack?.some((inner) => inner.handle === requireAuth)
  );
  const out: RouteInfo[] = [];
  let gate = false;
  const visit = (layer: Layer): void => {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        out.push({
          method: method.toUpperCase(),
          path: layer.route.path,
          access: gate ? 'protected' : 'public',
        });
      }
    } else if (layer.name === 'router') {
      layer.handle.stack?.forEach(visit);
    }
  };
  for (const layer of service?.handle.stack ?? []) {
    if (layer.handle === requireAuth) {
      gate = true;
      continue;
    }
    visit(layer);
  }
  return out;
}

export const routeId = (r: RouteInfo): string =>
  `${r.method} ${r.path} ${r.access}`;
