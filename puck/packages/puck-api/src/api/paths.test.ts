/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ThemeTokens } from '@commercetools-labs/puck-types';
import { describe, expect, it } from 'vitest';
import { createPuckClient } from '../client/client';
import {
  createFakeFetcher,
  fakeResponse,
  pathOf,
} from '../client/fake-fetcher';
import {
  getThemeApi,
  createThemeApi,
  updateThemeApi,
  importDefaultContentTypesApi,
} from './configuration.api';
import { resolveDatasourceApi } from './datasource.api';
import { fetchMediaLibraryApi, uploadMediaFileApi } from './media-library.api';
import { searchProductsApi } from './products.api';
import {
  createPuckContentApi,
  deletePuckContentApi,
  getPreviewPuckContentApi,
  getPublishedPuckContentApi,
  getPuckContentApi,
  listPuckContentsApi,
  queryPuckContentApi,
  updatePuckContentApi,
} from './puck-contents.api';
import {
  getPuckContentStatesApi,
  getPuckContentVersionsApi,
  publishPuckContentApi,
  revertPuckContentDraftApi,
} from './puck-content-states.api';
import {
  createPuckPageApi,
  deletePuckPageApi,
  getPreviewPuckPageApi,
  getPublishedPuckPageApi,
  getPuckPageApi,
  listPuckPagesApi,
  queryPuckPageApi,
  updatePuckPageApi,
} from './puck-pages.api';
import {
  getPuckPageStatesApi,
  getPuckPageVersionsApi,
  publishPuckPageApi,
  revertPuckPageDraftApi,
} from './puck-states.api';
import {
  createPuckTemplateApi,
  deletePuckTemplateApi,
  listPuckTemplatesApi,
} from './puck-templates.api';
import { PUCK_AUTH_POLICY } from '../client/auth-policy';

const BASE = 'http://svc.test/service';
const BU = 'main-store';

type Call = [
  name: string,
  method: string,
  path: string,
  run: (c: ReturnType<typeof createPuckClient>) => Promise<unknown>,
];

const theme = {} as ThemeTokens;
const file = new File(['x'], 'a.png', { type: 'image/png' });

const table: Call[] = [
  ['listPuckPagesApi', 'GET', `/${BU}/puck-pages`, (c) => listPuckPagesApi(c)],
  [
    'getPuckPageApi',
    'GET',
    `/${BU}/puck-pages/k1`,
    (c) => getPuckPageApi(c, 'k1'),
  ],
  [
    'createPuckPageApi',
    'POST',
    `/${BU}/puck-pages`,
    (c) => createPuckPageApi(c, { value: { name: 'n', slug: '/n' } }),
  ],
  [
    'updatePuckPageApi',
    'PUT',
    `/${BU}/puck-pages/k1`,
    (c) => updatePuckPageApi(c, 'k1', { value: {} }),
  ],
  [
    'deletePuckPageApi',
    'DELETE',
    `/${BU}/puck-pages/k1`,
    (c) => deletePuckPageApi(c, 'k1'),
  ],
  [
    'getPublishedPuckPageApi',
    'GET',
    `/${BU}/published/puck-pages/k1`,
    (c) => getPublishedPuckPageApi(c, 'k1'),
  ],
  [
    'getPreviewPuckPageApi',
    'GET',
    `/${BU}/preview/puck-pages/k1`,
    (c) => getPreviewPuckPageApi(c, 'k1'),
  ],
  [
    'queryPuckPageApi',
    'POST',
    `/${BU}/published/puck-pages/query`,
    (c) => queryPuckPageApi(c, { query: 'slug = "/x"' }, 'published'),
  ],
  [
    'getPuckPageStatesApi',
    'GET',
    `/${BU}/puck-pages/k1/states`,
    (c) => getPuckPageStatesApi(c, 'k1'),
  ],
  [
    'publishPuckPageApi',
    'PUT',
    `/${BU}/puck-pages/k1/states/published?clearDraft=true`,
    (c) => publishPuckPageApi(c, 'k1', true),
  ],
  [
    'revertPuckPageDraftApi',
    'DELETE',
    `/${BU}/puck-pages/k1/states/draft`,
    (c) => revertPuckPageDraftApi(c, 'k1'),
  ],
  [
    'getPuckPageVersionsApi',
    'GET',
    `/${BU}/puck-pages/k1/versions`,
    (c) => getPuckPageVersionsApi(c, 'k1'),
  ],
  [
    'listPuckContentsApi',
    'GET',
    `/${BU}/puck-contents?contentType=hero`,
    (c) => listPuckContentsApi(c, 'hero'),
  ],
  [
    'getPuckContentApi',
    'GET',
    `/${BU}/puck-contents/k1`,
    (c) => getPuckContentApi(c, 'k1'),
  ],
  [
    'createPuckContentApi',
    'POST',
    `/${BU}/puck-contents`,
    (c) =>
      createPuckContentApi(c, { value: { name: 'n', contentType: 'hero' } }),
  ],
  [
    'updatePuckContentApi',
    'PUT',
    `/${BU}/puck-contents/k1`,
    (c) => updatePuckContentApi(c, 'k1', { value: {} }),
  ],
  [
    'deletePuckContentApi',
    'DELETE',
    `/${BU}/puck-contents/k1`,
    (c) => deletePuckContentApi(c, 'k1'),
  ],
  [
    'getPublishedPuckContentApi',
    'GET',
    `/${BU}/published/puck-contents/k1`,
    (c) => getPublishedPuckContentApi(c, 'k1'),
  ],
  [
    'getPreviewPuckContentApi',
    'GET',
    `/${BU}/preview/puck-contents/k1`,
    (c) => getPreviewPuckContentApi(c, 'k1'),
  ],
  [
    'queryPuckContentApi',
    'POST',
    `/${BU}/preview/puck-contents/query`,
    (c) => queryPuckContentApi(c, { query: 'contentType = "hero"' }, 'preview'),
  ],
  [
    'getPuckContentStatesApi',
    'GET',
    `/${BU}/puck-contents/k1/states`,
    (c) => getPuckContentStatesApi(c, 'k1'),
  ],
  [
    'publishPuckContentApi',
    'PUT',
    `/${BU}/puck-contents/k1/states/published`,
    (c) => publishPuckContentApi(c, 'k1'),
  ],
  [
    'revertPuckContentDraftApi',
    'DELETE',
    `/${BU}/puck-contents/k1/states/draft`,
    (c) => revertPuckContentDraftApi(c, 'k1'),
  ],
  [
    'getPuckContentVersionsApi',
    'GET',
    `/${BU}/puck-contents/k1/versions`,
    (c) => getPuckContentVersionsApi(c, 'k1'),
  ],
  [
    'listPuckTemplatesApi',
    'GET',
    `/${BU}/puck-templates?kind=page`,
    (c) => listPuckTemplatesApi(c, 'page'),
  ],
  [
    'createPuckTemplateApi',
    'POST',
    `/${BU}/puck-templates`,
    (c) =>
      createPuckTemplateApi(c, {
        value: { kind: 'page', name: 'n', puckData: { content: [], root: {} } },
      }),
  ],
  [
    'deletePuckTemplateApi',
    'DELETE',
    `/${BU}/puck-templates/k1`,
    (c) => deletePuckTemplateApi(c, 'k1'),
  ],
  ['getThemeApi', 'GET', `/${BU}/configuration/theme`, (c) => getThemeApi(c)],
  [
    'createThemeApi',
    'POST',
    `/${BU}/configuration/theme`,
    (c) => createThemeApi(c, theme),
  ],
  [
    'updateThemeApi',
    'PUT',
    `/${BU}/configuration/theme`,
    (c) => updateThemeApi(c, theme),
  ],
  [
    'importDefaultContentTypesApi',
    'POST',
    `/${BU}/content-type/import`,
    (c) => importDefaultContentTypesApi(c),
  ],
  [
    'fetchMediaLibraryApi',
    'GET',
    `/${BU}/media-library?extensions=png%2Cjpg&limit=20&cursor=c1`,
    (c) =>
      fetchMediaLibraryApi(c, {
        extensions: ['png', 'jpg'],
        limit: 20,
        cursor: 'c1',
      }),
  ],
  [
    'uploadMediaFileApi',
    'POST',
    `/${BU}/upload-file`,
    (c) => uploadMediaFileApi(c, file, 'title'),
  ],
  [
    'searchProductsApi',
    'GET',
    '/products/search?text=shoe&limit=20&locale=en-US',
    (c) => searchProductsApi(c, 'shoe', { limit: 20, locale: 'en-US' }),
  ],
  [
    'resolveDatasourceApi',
    'POST',
    '/datasource/product-by-sku/test',
    (c) => resolveDatasourceApi(c, 'product-by-sku', { params: { sku: 'S' } }),
  ],
];

describe('raw API functions', () => {
  it('has a table row for every policy entry', () => {
    expect(table.map(([name]) => name).sort()).toEqual(
      Object.keys(PUCK_AUTH_POLICY).sort()
    );
  });

  it.each(table)('%s -> %s %s', async (_name, method, path, run) => {
    const fake = createFakeFetcher(() => fakeResponse(200, {}));
    const client = createPuckClient({
      baseURL: BASE,
      businessUnitKey: BU,
      jwtToken: 't',
      fetcher: fake.fetcher,
    });
    await run(client);
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0].method).toBe(method);
    expect(pathOf(fake.requests[0], BASE)).toBe(path);
  });

  it('encodes keys placed in a path', async () => {
    const fake = createFakeFetcher(() => fakeResponse(200, {}));
    const client = createPuckClient({
      baseURL: BASE,
      businessUnitKey: BU,
      jwtToken: 't',
      fetcher: fake.fetcher,
    });
    await getPuckPageApi(client, 'a/b?c');
    expect(pathOf(fake.requests[0], BASE)).toBe(`/${BU}/puck-pages/a%2Fb%3Fc`);
  });
});
