// jest `setupFiles` (NOT setupFilesAfterEnv): container env vars are read at import time.
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CONTAINER_ENV, TEST_CONTAINER_PREFIX } from './containers';
import { assertSandbox, e2eEnabled } from './sandbox-guard';

// Local, git-ignored files (first one wins for a given variable; real env wins over both).
// `E2E_ENV_FILE=/abs/path` points at a file kept outside the worktree (e.g. the main checkout's .env.e2e.local).
if (process.env.E2E_ENV_FILE) dotenv.config({ path: process.env.E2E_ENV_FILE });
dotenv.config({ path: path.resolve(__dirname, '../../.env.e2e') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.e2e.local') });

if (e2eEnabled()) {
  assertSandbox();
  const env = process.env;
  const runId = env.E2E_RUN_ID ?? Date.now().toString(36);
  env.E2E_RUN_ID = runId;

  env.CTP_PROJECT_KEY = env.E2E_CTP_PROJECT_KEY;
  env.CTP_CLIENT_ID = env.E2E_CTP_CLIENT_ID;
  env.CTP_CLIENT_SECRET = env.E2E_CTP_CLIENT_SECRET;
  env.CTP_SCOPE = env.E2E_CTP_SCOPE;
  env.CTP_REGION = env.E2E_CTP_REGION;

  // Real hosts: explicit overrides win, else derive from the region ("europe-west1.gcp" -> api.europe-west1.gcp.commercetools.com).
  const region = env.E2E_CTP_REGION as string;
  env.CTP_API_URL = env.E2E_CTP_API_URL || `https://api.${region}.commercetools.com`;
  env.CTP_AUTH_URL = env.E2E_CTP_AUTH_URL || `https://auth.${region}.commercetools.com`;

  for (const [name, suffix] of Object.entries(CONTAINER_ENV)) {
    env[name] = `${TEST_CONTAINER_PREFIX}${runId}-${suffix}`;
  }
}
