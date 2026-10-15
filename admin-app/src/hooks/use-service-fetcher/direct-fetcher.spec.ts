import { createDirectFetch } from './direct-fetcher';

const URL_ = 'http://localhost:8080/service/default/puck-pages';
const json = () =>
  new Response('[]', { headers: { 'content-type': 'application/json' } });

describe('createDirectFetch', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(json());
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls the service URL directly and adds the dev token as a Bearer credential', async () => {
    await createDirectFetch('tok')({
      url: URL_,
      method: 'POST',
      headers: { 'x-source': 'contentools-api' },
      body: '{}',
    });
    expect(fetchMock).toHaveBeenCalledWith(URL_, {
      method: 'POST',
      headers: { 'x-source': 'contentools-api', Authorization: 'Bearer tok' },
      body: '{}',
    });
  });

  it('sends no Authorization header without a token', async () => {
    await createDirectFetch()({ url: URL_, method: 'GET', headers: {} });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({});
  });

  it('turns a 2xx non-JSON body into a 502 error response', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html' },
      })
    );
    const res = await createDirectFetch()({
      url: URL_,
      method: 'GET',
      headers: {},
    });
    expect(res.status).toBe(502);
  });
});
