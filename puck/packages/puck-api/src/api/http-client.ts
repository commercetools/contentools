export interface HttpClientOptions {
  method?: string;
  headers: Record<string, string>;
  body?: string | FormData;
  /** Resolve to null on 404 instead of throwing (used by query APIs) */
  nullOn404?: boolean;
}

export async function httpClient<T>(
  url: string,
  opts: HttpClientOptions
): Promise<T> {
  const method = opts.method ?? 'GET';

  const headers: Record<string, string> = {
    ...opts.headers,
    'x-source': 'puck-api',
  };

  const res = await fetch(url, { method, headers, body: opts.body });

  if (res.status === 404 && opts.nullOn404) {
    return null as unknown as T;
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`[puck-api] HTTP ${res.status}: ${error || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (res.status === 204 || !contentType.includes('application/json')) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const readHeaders = (projectKey: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-project-key': projectKey,
});

export const writeHeaders = (
  projectKey: string,
  jwtToken: string
): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-project-key': projectKey,
  Authorization: `Bearer ${jwtToken}`,
});
