/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';

export class ConfigurationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid environment configuration: ${problems.join('; ')}`);
    this.name = 'ConfigurationError';
  }
}

const isHttpsOrLocal = (value: string): boolean =>
  value.startsWith('https://') || value.startsWith('http://localhost');

const httpsUrl = z
  .string()
  .refine((v) => URL.canParse(v) && isHttpsOrLocal(v), 'must be an https URL')
  .transform((v) => v.replace(/\/+$/, ''));

const required = (name: string) =>
  z.string({ error: 'is required' }).min(1, `${name} is required`);

const ctpSchema = z.object({
  CTP_API_URL: httpsUrl,
  CTP_AUTH_URL: httpsUrl,
  CTP_PROJECT_KEY: required('CTP_PROJECT_KEY'),
  CTP_CLIENT_ID: required('CTP_CLIENT_ID'),
  CTP_CLIENT_SECRET: required('CTP_CLIENT_SECRET'),
  CTP_SCOPE: z.string().default(''),
});

const runtimeSchema = z.object({
  NODE_ENV: z.string().default('production'),
  PORT: z.coerce
    .number({ error: 'must be an integer between 1 and 65535' })
    .int('must be an integer between 1 and 65535')
    .min(1, 'must be an integer between 1 and 65535')
    .max(65535, 'must be an integer between 1 and 65535')
    .default(8080),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'], {
      error: 'must be one of error|warn|info|debug',
    })
    .default('info'),
});

const contentSchema = z.object({
  MAX_VERSIONS: z.coerce
    .number({ error: 'must be an integer between 1 and 100' })
    .int('must be an integer between 1 and 100')
    .min(1, 'must be an integer between 1 and 100')
    .max(100, 'must be an integer between 1 and 100')
    .default(5),
  CONTAINER_PREFIX: z
    .string()
    .regex(/^[A-Za-z0-9_~.-]{0,64}$/, 'must match [A-Za-z0-9_~.-]{0,64}')
    .default(''),
});

const schema = z.object({
  ...ctpSchema.shape,
  ...runtimeSchema.shape,
  ...contentSchema.shape,
});

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Configuration {
  nodeEnv: string;
  port: number;
  logLevel: LogLevel;
  maxVersions: number;
  containerPrefix: string;
  ctp: {
    apiUrl: string;
    authUrl: string;
    projectKey: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
}

export type Env = Record<string, string | undefined>;

export function readConfiguration(env: Env = process.env): Configuration {
  const clean = Object.fromEntries(
    Object.entries(env).filter(([, x]) => x !== undefined && x !== '')
  );
  const parsed = schema.safeParse(clean);
  if (!parsed.success) {
    throw new ConfigurationError(
      parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`)
    );
  }
  const v = parsed.data;
  return {
    nodeEnv: v.NODE_ENV,
    port: v.PORT,
    logLevel: v.LOG_LEVEL,
    maxVersions: v.MAX_VERSIONS,
    containerPrefix: v.CONTAINER_PREFIX,
    ctp: {
      apiUrl: v.CTP_API_URL,
      authUrl: v.CTP_AUTH_URL,
      projectKey: v.CTP_PROJECT_KEY,
      clientId: v.CTP_CLIENT_ID,
      clientSecret: v.CTP_CLIENT_SECRET,
      scopes: v.CTP_SCOPE.split(/\s+/).filter(Boolean),
    },
  };
}

let cached: Configuration | undefined;
export const getConfiguration = (): Configuration =>
  (cached ??= readConfiguration());
export const resetConfigurationForTests = (): void => {
  cached = undefined;
};
