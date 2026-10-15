import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

// jest `setupFiles`: runs before the test file imports the app. Values are never printed.
const candidates = [
  process.env.E2E_ENV_FILE,
  path.resolve(__dirname, '../../.env.e2e'),
  path.resolve(__dirname, '../../.env.e2e.local'),
];
for (const file of candidates) {
  if (file && existsSync(file)) {
    loadDotenv({ path: file });
  }
}

const env = process.env;
const required = [
  'E2E_CTP_PROJECT_KEY',
  'E2E_CTP_CLIENT_ID',
  'E2E_CTP_CLIENT_SECRET',
  'E2E_CTP_REGION',
  'E2E_CTP_SCOPE',
  'E2E_ALLOW_PROJECT_KEY',
] as const;

export const liveEnabled =
  required.every((k) => !!env[k]) &&
  env.E2E_ALLOW_PROJECT_KEY === env.E2E_CTP_PROJECT_KEY;

if (liveEnabled) {
  const runId = env.E2E_RUN_ID ?? Date.now().toString(36);
  env.E2E_RUN_ID = runId;
  env.NODE_ENV = 'test';
  env.LOG_LEVEL = 'error';
  env.CTP_PROJECT_KEY = env.E2E_CTP_PROJECT_KEY;
  env.CTP_CLIENT_ID = env.E2E_CTP_CLIENT_ID;
  env.CTP_CLIENT_SECRET = env.E2E_CTP_CLIENT_SECRET;
  env.CTP_SCOPE = env.E2E_CTP_SCOPE;
  const region = env.E2E_CTP_REGION as string;
  env.CTP_API_URL =
    env.E2E_CTP_API_URL || `https://api.${region}.commercetools.com`;
  env.CTP_AUTH_URL =
    env.E2E_CTP_AUTH_URL || `https://auth.${region}.commercetools.com`;
  env.CONTAINER_PREFIX = `contentools-test-f-${runId}-`;
  // A throw-away token for this process only.
  env.SERVICE_API_TOKEN = `live-${randomBytes(24).toString('hex')}`;
  delete env.MAX_VERSIONS;
  delete env.PUBLIC_DATASOURCE_RESOLVE;
}
