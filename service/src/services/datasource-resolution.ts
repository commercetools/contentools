/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  MAX_DATASOURCE_SKUS,
  getProductBySku,
  getProductsBySku,
} from '../controllers/products.controller';
import type { PuckComponentData, PuckData } from '../types/content';
import { getLogger } from '../utils/logger.utils';

export const BUILT_IN_DATASOURCES = [
  {
    key: 'product-by-sku',
    value: {
      name: 'Get Product by SKU',
      key: 'product-by-sku',
      params: [{ key: 'sku', type: 'string', required: true }],
      builtIn: true,
    },
  },
  {
    key: 'products-by-sku',
    value: {
      name: 'Get Products by SKU',
      key: 'products-by-sku',
      params: [{ key: 'skus', type: 'string', required: true }],
      builtIn: true,
    },
  },
] as const;

export const isBuiltInDatasource = (key: string): boolean =>
  BUILT_IN_DATASOURCES.some((d) => d.key === key);

/** Resolves a built-in datasource and lets errors through (the test endpoint shows failures). */
export async function resolveDatasourceStrict(
  key: string,
  params: Record<string, unknown>
): Promise<unknown> {
  if (key === 'product-by-sku') {
    return getProductBySku(String(params.sku ?? ''));
  }
  if (key === 'products-by-sku') {
    return getProductsBySku(String(params.skus ?? ''));
  }
  return undefined;
}

/** Same as the strict variant, but a failure resolves to `null` (page reads must not break). */
export async function resolveDatasource(
  key: string,
  params: Record<string, unknown>
): Promise<unknown> {
  try {
    return await resolveDatasourceStrict(key, params);
  } catch {
    getLogger().warn('datasource resolution failed', { key });
    return null;
  }
}

const isDatasourceValue = (
  value: unknown
): value is { type: string; skus: unknown[] } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).type === 'string' &&
  Array.isArray((value as Record<string, unknown>).skus);

async function resolveComponentProps(
  props: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = { ...props };
  for (const [name, value] of Object.entries(props)) {
    if (!isDatasourceValue(value)) {
      continue;
    }
    const skus = value.skus
      .filter(Boolean)
      .map(String)
      .slice(0, MAX_DATASOURCE_SKUS);
    if (skus.length === 0) {
      continue;
    }
    const params =
      value.type === 'product-by-sku'
        ? { sku: skus[0] }
        : { skus: skus.join(',') };
    const data = await resolveDatasource(value.type, params);
    resolved[name] = { ...value, resolvedData: data ?? null };
  }
  return resolved;
}

const resolveComponents = (
  components: PuckComponentData[]
): Promise<PuckComponentData[]> =>
  Promise.all(
    components.map(async (component) => ({
      ...component,
      props: await resolveComponentProps(component.props ?? {}),
    }))
  );

/** Walks `content` and every zone and adds `resolvedData` next to each datasource-shaped prop. */
export async function resolvePuckData(puckData: PuckData): Promise<PuckData> {
  const content = await resolveComponents(puckData.content ?? []);
  const zones: Record<string, PuckComponentData[]> = {};
  if (puckData.zones) {
    for (const [zone, components] of Object.entries(puckData.zones)) {
      zones[zone] = await resolveComponents(components);
    }
  }
  return {
    ...puckData,
    content,
    ...(puckData.zones ? { zones } : {}),
  };
}
