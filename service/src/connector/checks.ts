import { containerName } from '../config/containers';
import { loadMediaConfig } from '../media/config';
import { MediaConfigError, StorageUnavailableError } from '../media/errors';
import { createStorageProvider } from '../media/provider-factory';
import type { StorageProvider } from '../media/types';
import { LifecycleError, type LifecycleEnv } from './env';

export interface CheckResult {
  check: string;
  status: 'ok' | 'warn' | 'skipped';
  detail?: string;
}

export type FetchFn = typeof fetch;

export const REQUIRED_SCOPES = [
  'manage_key_value_documents',
  'view_products',
] as const;

const TIMEOUT_MS = 10_000;

/** Network errors carry the URL in their message, so only the check name is reported. */
async function send(
  check: 'token' | 'custom-objects' | 'product-search',
  fetchFn: FetchFn,
  url: string,
  init: NonNullable<Parameters<FetchFn>[1]>
): Promise<Response> {
  try {
    return await fetchFn(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new LifecycleError(
      check,
      'request failed (network error or timeout)'
    );
  }
}

export async function checkToken(
  env: LifecycleEnv,
  fetchFn: FetchFn = fetch
): Promise<{ accessToken: string; scope: string }> {
  const basic = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString(
    'base64'
  );
  const res = await send('token', fetchFn, `${env.authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new LifecycleError('token', `HTTP ${res.status}`);
  const body = (await res.json().catch(() => null)) as {
    access_token?: unknown;
    scope?: unknown;
  } | null;
  if (
    typeof body?.access_token !== 'string' ||
    typeof body.scope !== 'string'
  ) {
    throw new LifecycleError('token', 'unexpected token response');
  }
  return { accessToken: body.access_token, scope: body.scope };
}

export function checkScopes(scope: string, projectKey: string): CheckResult {
  const granted = new Set(scope.split(/\s+/));
  for (const name of REQUIRED_SCOPES) {
    if (!granted.has(`${name}:${projectKey}`)) {
      throw new LifecycleError('scopes', `missing scope ${name}`);
    }
  }
  return { check: 'scopes', status: 'ok' };
}

export async function checkCustomObjects(
  env: LifecycleEnv,
  accessToken: string,
  fetchFn: FetchFn = fetch
): Promise<CheckResult> {
  const container = containerName(env.containerPrefix, 'puckPage');
  const res = await send(
    'custom-objects',
    fetchFn,
    `${env.apiUrl}/${env.projectKey}/custom-objects/${encodeURIComponent(container)}?limit=1`,
    { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new LifecycleError('custom-objects', `HTTP ${res.status}`);
  return { check: 'custom-objects', status: 'ok' };
}

export async function checkProductSearch(
  env: LifecycleEnv,
  accessToken: string,
  fetchFn: FetchFn = fetch
): Promise<CheckResult> {
  const res = await send(
    'product-search',
    fetchFn,
    `${env.apiUrl}/${env.projectKey}/products/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 1 }),
    }
  );
  if (res.ok) return { check: 'product-search', status: 'ok' };
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as {
      errors?: { code?: unknown }[];
    } | null;
    if (body?.errors?.[0]?.code === 'ObjectNotFound') {
      return {
        check: 'product-search',
        status: 'warn',
        detail:
          'Product Search is not activated: Merchant Center > Settings > Project settings > Storefront Search',
      };
    }
  }
  throw new LifecycleError('product-search', `HTTP ${res.status}`);
}

export async function checkStorage(
  env: Record<string, string | undefined>
): Promise<CheckResult> {
  let provider: StorageProvider | null;
  let name: string;
  try {
    const cfg = loadMediaConfig(env);
    name = cfg.provider;
    if (cfg.provider === 'none') return { check: 'storage', status: 'skipped' };
    provider = await createStorageProvider(cfg);
  } catch (e) {
    if (e instanceof MediaConfigError) {
      throw new LifecycleError('storage', e.message);
    }
    throw new LifecycleError('storage', 'storage client could not be created');
  }
  try {
    await provider?.checkConnectivity();
  } catch (e) {
    if (e instanceof StorageUnavailableError) {
      throw new LifecycleError('storage', e.message);
    }
    throw new LifecycleError('storage', `storage ${name} unavailable`);
  }
  return { check: 'storage', status: 'ok', detail: name };
}
