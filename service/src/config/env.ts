/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';
import {
  CLOUD_IDENTIFIERS,
  deriveCloudIdentifier,
  type CloudIdentifier,
} from '../auth/cloud-identifier';

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

const authSchema = z.object({
  CONNECT_SERVICE_URL: z.string().url().optional(),
  CLOUD_IDENTIFIER: z
    .enum(CLOUD_IDENTIFIERS, {
      error: 'must be one of gcp-au|gcp-eu|gcp-us|aws-eu|aws-us',
    })
    .optional(),
  SERVICE_API_TOKEN: z
    .string()
    .min(32, 'must be at least 32 characters')
    .refine(
      (v) => !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(v),
      'must not look like a JWT (three dot-separated parts)'
    )
    .optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  MC_REQUIRED_PERMISSION: z
    .string()
    .regex(/^can[A-Za-z0-9]+$/, 'must look like canManageSomething')
    .optional(),
  PUBLIC_DATASOURCE_RESOLVE: z.enum(['true', 'false']).default('false'),
  PUBLIC_RESOLVE_MAX_PER_MINUTE: z.coerce
    .number({ error: 'must be an integer between 1 and 100000' })
    .int('must be an integer between 1 and 100000')
    .min(1, 'must be an integer between 1 and 100000')
    .max(100000, 'must be an integer between 1 and 100000')
    .default(120),
});

const schema = z.object({
  ...ctpSchema.shape,
  ...runtimeSchema.shape,
  ...contentSchema.shape,
  ...authSchema.shape,
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
  auth: {
    /** undefined when Merchant Center tokens cannot be verified (no CONNECT_SERVICE_URL or unknown region) */
    mc?: {
      issuer: CloudIdentifier;
      audienceOrigin: string;
      requiredPermission?: string;
    };
    serviceToken?: string;
    corsOrigins: string[] | 'all';
    /** opt-in public built-in datasource resolve */
    publicResolve: { enabled: boolean; maxPerMinute: number };
  };
}

function parseCorsOrigins(
  raw: string | undefined,
  problems: string[]
): string[] | 'all' {
  if (raw === undefined || raw.trim() === '') return [];
  if (raw.trim() === '*') return 'all';
  const origins: string[] = [];
  const entries = raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const origin = URL.canParse(entry) ? new URL(entry).origin : undefined;
    if (origin === undefined || origin !== entry) {
      problems.push(
        `CORS_ALLOWED_ORIGINS: "${entry}" is not an origin (scheme://host[:port], no trailing slash)`
      );
    } else {
      origins.push(entry);
    }
  }
  return origins;
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
  const corsProblems: string[] = [];
  const corsOrigins = parseCorsOrigins(v.CORS_ALLOWED_ORIGINS, corsProblems);
  if (corsProblems.length > 0) throw new ConfigurationError(corsProblems);
  const issuer = v.CLOUD_IDENTIFIER ?? deriveCloudIdentifier(v.CTP_API_URL);
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
    auth: {
      ...(v.CONNECT_SERVICE_URL && issuer
        ? {
            mc: {
              issuer,
              audienceOrigin: new URL(v.CONNECT_SERVICE_URL).origin,
              ...(v.MC_REQUIRED_PERMISSION && {
                requiredPermission: v.MC_REQUIRED_PERMISSION,
              }),
            },
          }
        : {}),
      ...(v.SERVICE_API_TOKEN && { serviceToken: v.SERVICE_API_TOKEN }),
      corsOrigins,
      publicResolve: {
        enabled: v.PUBLIC_DATASOURCE_RESOLVE === 'true',
        maxPerMinute: v.PUBLIC_RESOLVE_MAX_PER_MINUTE,
      },
    },
  };
}

let cached: Configuration | undefined;
export const getConfiguration = (): Configuration =>
  (cached ??= readConfiguration());
export const resetConfigurationForTests = (): void => {
  cached = undefined;
};
