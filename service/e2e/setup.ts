import { ensureE2EEnv, E2E_ENV } from './constants';
import { request } from './helpers/http';

let cachedJwt: string | null = null;

export async function getJwt(): Promise<string> {
  if (cachedJwt) return cachedJwt;
  ensureE2EEnv();
  const { status, body } = await request<{ token?: string }>('POST', '/authenticate-project', {
    body: {
      ct_project_key: E2E_ENV.CTP_PROJECT_KEY,
      ct_client_id: E2E_ENV.CTP_CLIENT_ID,
      ct_client_secret: E2E_ENV.CTP_CLIENT_SECRET,
      ct_region: E2E_ENV.CTP_REGION,
      ct_scope: E2E_ENV.CTP_SCOPE,
    },
  });
  if (status !== 200 || !(body && typeof body === 'object' && 'token' in body)) {
    throw new Error(`E2E setup: authenticate-project failed (${status}): ${JSON.stringify(body)}`);
  }
  cachedJwt = (body as { token: string }).token;
  return cachedJwt;
}

export function getProjectKey(): string {
  return E2E_ENV.CTP_PROJECT_KEY;
}

export function getBusinessUnitKey(): string {
  return E2E_ENV.BUSINESS_UNIT_KEY;
}

beforeAll(async () => {
  ensureE2EEnv();
  await getJwt();
});
