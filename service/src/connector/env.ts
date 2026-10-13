/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export type CheckName =
  | 'config'
  | 'token'
  | 'scopes'
  | 'custom-objects'
  | 'product-search'
  | 'storage'
  | 'unexpected';

/** A failed lifecycle check. `reason` is safe to print: names and HTTP statuses only, never values. */
export class LifecycleError extends Error {
  constructor(
    readonly check: CheckName,
    readonly reason: string
  ) {
    super(reason);
    this.name = 'LifecycleError';
  }
}

export interface LifecycleEnv {
  apiUrl: string;
  authUrl: string;
  projectKey: string;
  clientId: string;
  clientSecret: string;
  containerPrefix: string;
}

type Env = Record<string, string | undefined>;

const REQUIRED = [
  'CTP_API_URL',
  'CTP_AUTH_URL',
  'CTP_PROJECT_KEY',
  'CTP_CLIENT_ID',
  'CTP_CLIENT_SECRET',
] as const;

const stripSlash = (value: string): string => value.replace(/\/+$/, '');

export function readLifecycleEnv(env: Env): LifecycleEnv {
  const value = (name: string): string => (env[name] ?? '').trim();
  const missing = REQUIRED.filter((name) => value(name) === '');
  if (missing.length > 0) {
    throw new LifecycleError('config', `missing: ${missing.join(', ')}`);
  }
  const prefix = value('CONTAINER_PREFIX');
  if (!/^[A-Za-z0-9_~.-]{0,64}$/.test(prefix)) {
    throw new LifecycleError(
      'config',
      'CONTAINER_PREFIX must match [A-Za-z0-9_~.-]{0,64}'
    );
  }
  return {
    apiUrl: stripSlash(value('CTP_API_URL')),
    authUrl: stripSlash(value('CTP_AUTH_URL')),
    projectKey: value('CTP_PROJECT_KEY'),
    clientId: value('CTP_CLIENT_ID'),
    clientSecret: value('CTP_CLIENT_SECRET'),
    containerPrefix: prefix,
  };
}
