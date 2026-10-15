import { API, AUTH } from '../support/fake-ct';
import { loadFixture } from '../support/fixtures';

describe('fake commercetools behind msw', () => {
  it('serves the token endpoint', async () => {
    const res = await fetch(`${AUTH}/oauth/token`, { method: 'POST', body: 'grant_type=client_credentials' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).access_token).toBe('fake-access-token');
  });

  it('round-trips a custom object', async () => {
    const page = loadFixture('puck-page.json');
    const post = await fetch(`${API}/test-project/custom-objects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ container: 'puck-page', key: page.key, value: page }),
    });
    expect(post.status).toBe(201);
    const get = await fetch(`${API}/test-project/custom-objects/puck-page/${page.key}`);
    expect(get.status).toBe(200);
    expect(((await get.json()) as any).value.name).toBe('Home');
  });

  it('rejects requests to unhandled hosts (offline by construction)', async () => {
    await expect(fetch('http://example.invalid/')).rejects.toThrow();
  });
});
