import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from service root (for local E2E) or use process.env (CI)
const serviceEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: serviceEnvPath });

// // --- Env variable names (keys in process.env), all prefixed with E2E_ ---
// export const ENV_KEYS = {
//   E2E_BASE_URL: 'E2E_BASE_URL',
//   E2E_BUSINESS_UNIT_KEY: 'E2E_BUSINESS_UNIT_KEY',
//   E2E_CTP_PROJECT_KEY: 'E2E_CTP_PROJECT_KEY',
//   E2E_CTP_CLIENT_ID: 'E2E_CTP_CLIENT_ID',
//   E2E_CTP_CLIENT_SECRET: 'E2E_CTP_CLIENT_SECRET',
//   E2E_CTP_REGION: 'E2E_CTP_REGION',
//   E2E_CTP_SCOPE: 'E2E_CTP_SCOPE',
//   E2E_CTP_AUTH_URL: 'E2E_CTP_AUTH_URL',
//   E2E_CTP_API_URL: 'E2E_CTP_API_URL',
// } as const;

// --- Default values ---
export const DEFAULT_BASE_URL = 'http://localhost:8080';
export const DEFAULT_BUSINESS_UNIT_KEY = 'e2e-bu';

// --- API path ---
export const SERVICE_PREFIX = '/service';

// --- Resolved env (values from process.env with fallback to non-prefixed for local .env) ---
export const E2E_ENV = {
  BASE_URL:
    process.env.E2E_BASE_URL || DEFAULT_BASE_URL,
  BUSINESS_UNIT_KEY:
    process.env.E2E_BUSINESS_UNIT_KEY ?? '',
  CTP_PROJECT_KEY:
    process.env.E2E_CTP_PROJECT_KEY ?? '',
  CTP_CLIENT_ID:
    process.env.E2E_CTP_CLIENT_ID ?? '',
  CTP_CLIENT_SECRET:
    process.env.E2E_CTP_CLIENT_SECRET ?? '',
  CTP_REGION:
    process.env.E2E_CTP_REGION ?? '',
  CTP_SCOPE:
    process.env.E2E_CTP_SCOPE ?? '',
};

function requireEnv(name: string, value: string): void {
  if (!value) {
    throw new Error(`E2E missing required env: ${name}`);
  }
}

export function ensureE2EEnv(): void {
  requireEnv('E2E_BASE_URL', E2E_ENV.BASE_URL);
  requireEnv('E2E_BUSINESS_UNIT_KEY', E2E_ENV.BUSINESS_UNIT_KEY ?? '');
  requireEnv('E2E_CTP_PROJECT_KEY', E2E_ENV.CTP_PROJECT_KEY ?? '');
  requireEnv('E2E_CTP_CLIENT_ID', E2E_ENV.CTP_CLIENT_ID ?? '');
  requireEnv('E2E_CTP_CLIENT_SECRET', E2E_ENV.CTP_CLIENT_SECRET ?? '');
}
