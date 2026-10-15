export const REQUIRED = [
  'E2E_CTP_PROJECT_KEY',
  'E2E_CTP_CLIENT_ID',
  'E2E_CTP_CLIENT_SECRET',
  'E2E_CTP_REGION',
  'E2E_CTP_SCOPE',
  'E2E_BUSINESS_UNIT_KEY',
  'E2E_ALLOW_PROJECT_KEY',
] as const;

export const e2eEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => REQUIRED.every((k) => !!env[k]);

/** Throws unless every variable is set and the allow-list key equals the project key. Never prints values. */
export function assertSandbox(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`e2e: missing ${missing.join(', ')}`);
  if (env.E2E_CTP_PROJECT_KEY !== env.E2E_ALLOW_PROJECT_KEY) {
    throw new Error('e2e: refusing to run: E2E_ALLOW_PROJECT_KEY must equal E2E_CTP_PROJECT_KEY (sandbox only)');
  }
}
