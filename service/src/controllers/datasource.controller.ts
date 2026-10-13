/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { customObjects } from '../ct/custom-objects';
import CustomError from '../errors/custom.error';
import {
  BUILT_IN_DATASOURCES,
  isBuiltInDatasource,
  resolveDatasourceStrict,
} from '../services/datasource-resolution';

export interface DatasourceEntry {
  key: string;
  value: unknown;
}

const definitions = () => customObjects('datasource');

const assertWritable = (key: string): void => {
  if (isBuiltInDatasource(key)) {
    throw new CustomError(409, `Datasource '${key}' is built in and read-only`);
  }
};

const notFound = (key: string): CustomError =>
  new CustomError(404, `Datasource '${key}' not found`);

export async function listDatasources(): Promise<DatasourceEntry[]> {
  const stored = await definitions().list();
  const builtIns = BUILT_IN_DATASOURCES.map((d) => ({
    key: d.key,
    value: d.value,
  }));
  return [
    ...builtIns,
    ...stored
      .filter((o) => !isBuiltInDatasource(o.key))
      .map((o) => ({ key: o.key, value: o.value })),
  ];
}

export async function getDatasource(key: string): Promise<DatasourceEntry> {
  const builtIn = BUILT_IN_DATASOURCES.find((d) => d.key === key);
  if (builtIn) {
    return { key: builtIn.key, value: builtIn.value };
  }
  const found = await definitions().get(key);
  if (!found) {
    throw notFound(key);
  }
  return { key, value: found.value };
}

export async function createDatasource(
  key: string,
  value: unknown
): Promise<DatasourceEntry> {
  assertWritable(key);
  try {
    await definitions().create(key, value);
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 409) {
      throw new CustomError(409, `Datasource '${key}' already exists`);
    }
    throw error;
  }
  return { key, value };
}

export async function putDatasource(
  key: string,
  value: unknown
): Promise<DatasourceEntry> {
  assertWritable(key);
  await definitions().put(key, value);
  return { key, value };
}

/** Idempotent. */
export async function deleteDatasource(key: string): Promise<void> {
  assertWritable(key);
  await definitions().delete(key);
}

export async function testDatasource(
  key: string,
  params: Record<string, unknown>
): Promise<unknown> {
  if (isBuiltInDatasource(key)) {
    return resolveDatasourceStrict(key, params);
  }
  const stored = await definitions().get(key);
  if (!stored) {
    throw notFound(key);
  }
  throw new CustomError(501, 'Datasource has no resolver');
}
