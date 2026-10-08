/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest, type ApiTest } from '../support/api';

jest.setTimeout(60_000);

let t: ApiTest;
beforeEach(() => {
  t = setupApiTest();
});

const stored = () =>
  [...t.fake.store.objects.values()].filter((o) => o.container === 'content-type');

describe('content type import', () => {
  it.each(['/service/content-type/import', '/service/default/content-type/import'])(
    'imports the 27 default types through %s',
    async (path) => {
      const res = await t.http.post(path).set(t.auth).send();
      expect(res.status).toBe(200);
      expect(res.body.imported).toHaveLength(27);
      expect(res.body.failed).toEqual([]);
      expect(stored()).toHaveLength(27);
      const logo = stored().find((o) => o.key === 'website-logo');
      expect(logo).toBeDefined();
      const code = (logo?.value as { code: { transpiledCode: string } }).code.transpiledCode;
      expect(Buffer.from(code, 'base64').toString('utf-8').trim().startsWith('(function(React)')).toBe(true);
    }
  );

  it('is idempotent', async () => {
    const first = await t.http.post('/service/content-type/import').set(t.auth).send();
    const second = await t.http.post('/service/content-type/import').set(t.auth).send();
    expect(stored()).toHaveLength(27);
    expect(second.body).toEqual(first.body);
  });

  it('requires a credential', async () => {
    expect((await t.http.post('/service/content-type/import').send()).status).toBe(401);
    expect((await t.http.post('/service/default/content-type/import').send()).status).toBe(401);
  });
});
