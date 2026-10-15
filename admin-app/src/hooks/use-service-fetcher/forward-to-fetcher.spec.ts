import { forwardToFetch } from './forward-to-fetcher';

const SERVICE_URL = 'https://svc.example/service/default/puck-pages';

const jsonResponse = (status = 200) =>
  new Response('{}', {
    status,
    headers: { 'content-type': 'application/json' },
  });

const headerOf = (init: RequestInit | undefined, name: string) => {
  const headers = new Headers(init?.headers as HeadersInit);
  return headers.get(name);
};

describe('forwardToFetch', () => {
  const originalFetch = global.fetch;
  const originalApp = (window as { app?: unknown }).app;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    (window as { app?: unknown }).app = {
      mcApiUrl: 'https://mc-api.europe-west1.gcp.commercetools.com',
      cloudIdentifier: 'gcp-eu',
      applicationId: 'app-id',
      applicationName: 'contentools',
      entryPointUriPath: 'contentools',
      location: 'eu',
      env: 'production',
    };
    fetchMock = jest.fn().mockResolvedValue(jsonResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (window as { app?: unknown }).app = originalApp;
  });

  it('sends the request through the forward-to proxy with the forward headers', async () => {
    await forwardToFetch({
      url: SERVICE_URL,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/proxy\/forward-to$/);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('{"a":1}');
    expect(headerOf(init, 'X-Forward-To')).toBe(SERVICE_URL);
    expect(headerOf(init, 'X-Forward-To-Audience-Policy')).toBe(
      'forward-url-origin'
    );
    expect(headerOf(init, 'X-Forward-To-Claims')).toBe('permissions');
    expect(headerOf(init, 'Accept-version')).toBe('v2');
    // puck's own headers reach the service with the prefix the gateway forwards
    expect(headerOf(init, 'x-forward-header-Content-Type')).toBe(
      'application/json'
    );
    expect(headerOf(init, 'Content-Type')).toBe('application/json');
  });

  it('passes a FormData body by reference and sets no content type', async () => {
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'a.png');

    await forwardToFetch({
      url: 'https://svc.example/service/default/media-library/upload',
      method: 'POST',
      headers: {},
      body: form,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(form);
    expect(headerOf(init, 'Content-Type')).toBeNull();
  });

  it('retries once after a 401 (the shell renews the token) and returns a 403 without retry', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200));
    const ok = await forwardToFetch({
      url: SERVICE_URL,
      method: 'GET',
      headers: {},
    });
    expect(ok.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(403));
    const forbidden = await forwardToFetch({
      url: SERVICE_URL,
      method: 'GET',
      headers: {},
    });
    expect(forbidden.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns a 2xx non-JSON body (tunnel or proxy page) into a 502 error response', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>interstitial</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    );
    const res = await forwardToFetch({
      url: SERVICE_URL,
      method: 'GET',
      headers: {},
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      message: expect.stringContaining(
        'Expected a JSON response from the service but received text/html'
      ),
    });
  });

  it('keeps 204 and empty-body responses untouched', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const none = await forwardToFetch({
      url: SERVICE_URL,
      method: 'DELETE',
      headers: {},
    });
    expect(none.status).toBe(204);

    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    const empty = await forwardToFetch({
      url: SERVICE_URL,
      method: 'DELETE',
      headers: {},
    });
    expect(empty.status).toBe(200);
  });
});
