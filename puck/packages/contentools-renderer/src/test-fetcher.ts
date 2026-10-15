import type {
  PuckFetcher,
  PuckRequest,
  PuckResponse,
} from '@commercetools-labs/contentools-types';

/** Test helper (not exported): builds a `PuckResponse` without a network. */
export const jsonResponse = (status: number, body?: unknown): PuckResponse => {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' && body !== undefined
          ? 'application/json'
          : null,
    },
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  };
};

/** Test helper (not exported): a fetcher that records every request. */
export const recordingFetcher = (
  respond: (request: PuckRequest) => PuckResponse = () => jsonResponse(200, {})
): { fetcher: PuckFetcher; requests: PuckRequest[] } => {
  const requests: PuckRequest[] = [];
  return {
    requests,
    fetcher: async (request) => {
      requests.push(request);
      return respond(request);
    },
  };
};
