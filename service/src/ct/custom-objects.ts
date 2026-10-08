/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { CustomObject } from '@commercetools/platform-sdk';
import { containerName, type ContainerKey } from '../config/containers';
import { getConfiguration } from '../config/env';
import CustomError from '../errors/custom.error';
import { getLogger } from '../utils/logger.utils';
import { getApiRoot } from './client';
import { toCustomError, upstreamStatus } from './errors';

const PAGE_SIZE = 500;
const LIST_CAP = 10_000;

export interface CustomObjectsClient {
  readonly container: string;
  get(key: string): Promise<CustomObject | null>;
  getOrThrow(key: string): Promise<CustomObject>;
  create(key: string, value: unknown): Promise<CustomObject>;
  put(key: string, value: unknown, version?: number): Promise<CustomObject>;
  delete(key: string): Promise<boolean>;
  list(
    where?: string,
    options?: { limit?: number }
  ): Promise<CustomObject[]>;
  update<T>(
    key: string,
    mutate: (current: T | null) => T,
    maxAttempts?: number
  ): Promise<CustomObject>;
}

export function customObjects(containerKey: ContainerKey): CustomObjectsClient {
  const container = containerName(
    getConfiguration().containerPrefix,
    containerKey
  );

  const get = async (key: string): Promise<CustomObject | null> => {
    try {
      const res = await getApiRoot()
        .customObjects()
        .withContainerAndKey({ container, key })
        .get()
        .execute();
      return res.body;
    } catch (error) {
      if (upstreamStatus(error) === 404) {
        return null;
      }
      throw toCustomError(error, 'customObjects.get');
    }
  };

  const put = async (
    key: string,
    value: unknown,
    version?: number
  ): Promise<CustomObject> => {
    try {
      const res = await getApiRoot()
        .customObjects()
        .post({
          body: {
            container,
            key,
            value,
            ...(version !== undefined && { version }),
          },
        })
        .execute();
      return res.body;
    } catch (error) {
      throw toCustomError(error, 'customObjects.put');
    }
  };

  return {
    container,
    get,
    put,

    async getOrThrow(key) {
      const found = await get(key);
      if (!found) {
        throw new CustomError(404, `Custom object not found with key: ${key}`);
      }
      return found;
    },

    async create(key, value) {
      if (await get(key)) {
        throw new CustomError(409, 'Already exists');
      }
      return put(key, value);
    },

    async delete(key) {
      try {
        await getApiRoot()
          .customObjects()
          .withContainerAndKey({ container, key })
          .delete()
          .execute();
        return true;
      } catch (error) {
        if (upstreamStatus(error) === 404) {
          return false;
        }
        throw toCustomError(error, 'customObjects.delete');
      }
    },

    async list(where, options) {
      const results: CustomObject[] = [];
      const wanted = options?.limit;
      let offset = 0;
      for (;;) {
        if (wanted !== undefined && results.length >= wanted) {
          break;
        }
        const pageLimit =
          wanted === undefined
            ? PAGE_SIZE
            : Math.min(PAGE_SIZE, wanted - results.length);
        if (offset >= LIST_CAP) {
          getLogger().warn('custom object list truncated at cap', {
            container,
            cap: LIST_CAP,
          });
          break;
        }
        let page: CustomObject[];
        try {
          const res = await getApiRoot()
            .customObjects()
            .withContainer({ container })
            .get({
              queryArgs: {
                ...(where && { where }),
                limit: pageLimit,
                offset,
                sort: ['id asc'],
                withTotal: false,
              },
            })
            .execute();
          page = res.body.results;
        } catch (error) {
          throw toCustomError(error, 'customObjects.list');
        }
        results.push(...page);
        if (page.length < pageLimit) {
          break;
        }
        offset += pageLimit;
      }
      return results;
    },

    async update<T>(
      key: string,
      mutate: (current: T | null) => T,
      maxAttempts = 3
    ): Promise<CustomObject> {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const current = await get(key);
        const next = mutate(current ? (current.value as T) : null);
        try {
          return await put(key, next, current?.version);
        } catch (error) {
          if (error instanceof CustomError && error.statusCode === 409) {
            continue;
          }
          throw error;
        }
      }
      throw new CustomError(
        409,
        'Conflict: the object was modified concurrently'
      );
    },
  };
}
