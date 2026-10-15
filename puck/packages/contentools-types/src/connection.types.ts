export type PuckHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface PuckRequest {
  /** Absolute URL: baseURL + path (+ query). */
  url: string;
  method: PuckHttpMethod;
  headers: Record<string, string>;
  /** JSON string or multipart form data. */
  body?: string | FormData;
}

/** Minimal structural subset of the Fetch Response; a real Response satisfies it. */
export interface PuckResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type PuckFetcher = (request: PuckRequest) => Promise<PuckResponse>;

export type PuckAuthHeaders = Record<string, string>;
export type PuckGetAuthHeaders = () => PuckAuthHeaders | Promise<PuckAuthHeaders>;

export interface PuckConnection {
  /** Service base URL including the service prefix, e.g. https://x.example/service */
  baseURL: string;
  /** Business unit that scopes the content (`/:businessUnitKey/...`). */
  businessUnitKey: string;
  /** Content locale, e.g. "en-US" (UI language and locale-aware calls). */
  locale?: string;
  /** Convenience: sent as `Authorization: Bearer <jwtToken>`. */
  jwtToken?: string;
  /** Evaluated before EVERY request; wins over `jwtToken`. Use for refreshing tokens. */
  getAuthHeaders?: PuckGetAuthHeaders;
  /** Replaces `globalThis.fetch` (Merchant Center forward-to proxy, tests, instrumentation). */
  fetcher?: PuckFetcher;
  /**
   * Mirror of the service flag PUBLIC_DATASOURCE_RESOLVE. When true, product blocks without
   * embedded `resolvedData` may call datasource resolve anonymously. Default false.
   */
  publicDatasourceResolve?: boolean;
}
