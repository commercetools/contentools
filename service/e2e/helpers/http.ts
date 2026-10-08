import { E2E_ENV, SERVICE_PREFIX } from '../constants';

export type RequestOptions = {
  headers?: Record<string, string>;
  body?: unknown;
  jwt?: string;
  projectKey?: string;
};

function defaultHeaders(opts: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  if (opts.projectKey !== undefined) {
    headers['x-project-key'] = opts.projectKey;
  }
  if (opts.jwt) {
    headers['Authorization'] = `Bearer ${opts.jwt}`;
  }
  return headers;
}

export async function request<T = unknown>(
  method: string,
  path: string,
  opts: RequestOptions = {}
): Promise<{ status: number; body: T; headers: Headers }> {
  const url = path.startsWith('http') ? path : `${E2E_ENV.BASE_URL}${SERVICE_PREFIX}${path}`;
  const headers = defaultHeaders(opts);
  const init: RequestInit = {
    method,
    headers,
  };
  if (opts.body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  let body: T;
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    const text = await res.text();
    body = (text ? JSON.parse(text) : undefined) as T;
  } else {
    body = (await res.text()) as unknown as T;
  }
  return { status: res.status, body, headers: res.headers };
}

export function apiPath(segments: string[]): string {
  const path = segments.filter(Boolean).join('/');
  return path.startsWith('/') ? path : `/${path}`;
}
