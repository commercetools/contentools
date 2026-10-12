/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Dependency-free mock of the Contentools service, for the playground and for tests.
// It follows the client contract of the Puck packages (routes, auth policy, error envelope),
// not the real implementation. Development tool: never deployed, never published.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PREFIX = '/service';
const BU = 'main-store';
const CONTAINER_PAGES = 'puck-pages';
const CONTAINER_CONTENTS = 'puck-contents';

/**
 * Operations that always need `Authorization: Bearer <token>`. The names are the exported raw
 * API function names of contentools-api; a test compares this list with `PUCK_AUTH_POLICY`.
 * `queryPuck*Api` is protected only in preview mode and `resolveDatasourceApi` depends on the
 * flag MOCK_PUBLIC_DATASOURCE_RESOLVE, so both are handled in `isProtected`.
 */
export const PROTECTED_OPS = new Set([
  'listPuckPagesApi',
  'getPuckPageApi',
  'createPuckPageApi',
  'updatePuckPageApi',
  'deletePuckPageApi',
  'getPreviewPuckPageApi',
  'getPuckPageStatesApi',
  'publishPuckPageApi',
  'revertPuckPageDraftApi',
  'getPuckPageVersionsApi',
  'listPuckContentsApi',
  'getPuckContentApi',
  'createPuckContentApi',
  'updatePuckContentApi',
  'deletePuckContentApi',
  'getPreviewPuckContentApi',
  'getPuckContentStatesApi',
  'publishPuckContentApi',
  'revertPuckContentDraftApi',
  'getPuckContentVersionsApi',
  'listPuckTemplatesApi',
  'createPuckTemplateApi',
  'deletePuckTemplateApi',
  'createThemeApi',
  'updateThemeApi',
  'importDefaultContentTypesApi',
  'fetchMediaLibraryApi',
  'uploadMediaFileApi',
  'searchProductsApi',
]);

const now = () => new Date().toISOString();

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const PRODUCT = {
  id: 'p1',
  name: { 'en-US': 'Canvas Sneaker' },
  description: { 'en-US': 'A light everyday sneaker.' },
  slug: { 'en-US': 'canvas-sneaker' },
  masterVariant: {
    sku: 'SKU-1',
    images: [{ url: 'https://placehold.co/600x600' }],
    prices: [{ value: { centAmount: 5900, currencyCode: 'EUR', fractionDigits: 2 } }],
  },
};

const SEARCH_RESULTS = [
  { id: 'p1', name: 'Canvas Sneaker', sku: 'SKU-1', image: 'https://placehold.co/200x200', slug: 'canvas-sneaker' },
  { id: 'p2', name: 'Leather Boot', sku: 'SKU-2', image: 'https://placehold.co/200x200', slug: 'leather-boot' },
  { id: 'p3', name: 'Running Shoe', sku: 'SKU-3', image: 'https://placehold.co/200x200', slug: 'running-shoe' },
];

const MEDIA_FILES = Array.from({ length: 6 }, (_, i) => ({
  url: `https://placehold.co/400x300?text=image-${i + 1}`,
  name: `image-${i + 1}.png`,
  title: `Image ${i + 1}`,
  isImage: true,
  key: `media/image-${i + 1}.png`,
  contentType: 'image/png',
  size: 2048 * (i + 1),
  createdAt: '2026-01-01T00:00:00.000Z',
}));

const heroData = (title) => ({
  root: { props: {} },
  content: [
    {
      type: 'HeroBanner',
      props: {
        id: 'hero-1',
        title,
        subtitle: 'Served by the mock service',
        image: 'https://placehold.co/1200x675',
      },
    },
    { type: 'TextBlock', props: { id: 'text-1', content: '<p>Hello from the mock service.</p>' } },
    {
      type: 'ProductBanner',
      props: {
        id: 'product-1',
        title: 'Featured product',
        description: '',
        ctaText: '',
        ctaLink: '',
        productOnLeft: false,
        background: '#f5f5f5',
        product: { type: 'product-by-sku', skus: ['SKU-1'] },
      },
    },
  ],
});

const record = (kind, key, value) => ({
  id: randomUUID(),
  version: 1,
  container: kind,
  key,
  createdAt: value.createdAt,
  lastModifiedAt: value.updatedAt,
  draft: undefined,
  published: undefined,
  versions: [],
});

function seed() {
  const store = {
    pages: new Map(),
    contents: new Map(),
    templates: new Map(),
    theme: null,
    uploads: 0,
  };
  const stamp = now();
  const page = (key, name, slug, title, withDraft) => {
    const value = { key, businessUnitKey: BU, name, slug, puckData: heroData(title), createdAt: stamp, updatedAt: stamp };
    const item = record(CONTAINER_PAGES, key, value);
    item.published = value;
    item.versions.push({ ...value, id: randomUUID(), timestamp: stamp });
    if (withDraft) item.draft = { ...value, puckData: heroData(`${title} (draft)`) };
    store.pages.set(key, item);
  };
  page('home', 'Home', '/home', 'Welcome', true);
  page('about', 'About', '/about', 'About us', false);

  const contentValue = {
    key: 'hero-banner',
    businessUnitKey: BU,
    name: 'Hero banner',
    contentType: 'hero',
    data: heroData('Shared hero'),
    createdAt: stamp,
    updatedAt: stamp,
  };
  const content = record(CONTAINER_CONTENTS, 'hero-banner', contentValue);
  content.published = contentValue;
  content.versions.push({ ...contentValue, id: randomUUID(), timestamp: stamp });
  store.contents.set('hero-banner', content);

  store.templates.set('starter', {
    id: randomUUID(),
    version: 1,
    container: 'puck-templates',
    key: 'starter',
    createdAt: stamp,
    lastModifiedAt: stamp,
    value: {
      key: 'starter',
      businessUnitKey: BU,
      name: 'Starter',
      kind: 'page',
      puckData: heroData('Starter'),
      createdAt: stamp,
      updatedAt: stamp,
    },
  });
  return store;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const correlationId = () => randomUUID();

function send(res, status, body, headers = {}) {
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function fail(res, status, message, code, headers = {}) {
  send(res, status, { message, statusCode: status, correlationId: correlationId(), ...(code ? { code } : {}) }, headers);
}

function cors(req, res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-source');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw || !String(req.headers['content-type'] ?? '').includes('application/json')) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

const KIND = '(puck-pages|puck-contents)';
const routes = [
  ['GET', /^\/health$/, () => ({ op: 'health' })],
  ['POST', /^\/__reset$/, () => ({ op: 'reset' })],
  ['GET', /^\/products\/search$/, () => ({ op: 'searchProductsApi' })],
  ['POST', /^\/datasource\/([^/]+)\/test$/, (m) => ({ op: 'resolveDatasourceApi', key: m[1] })],
  ['POST', /^\/content-type\/import$/, () => ({ op: 'importDefaultContentTypesApi' })],
  ['POST', /^\/([^/]+)\/content-type\/import$/, () => ({ op: 'importDefaultContentTypesApi' })],
  ['GET', /^\/([^/]+)\/configuration\/theme$/, () => ({ op: 'getThemeApi' })],
  ['POST', /^\/([^/]+)\/configuration\/theme$/, () => ({ op: 'createThemeApi' })],
  ['PUT', /^\/([^/]+)\/configuration\/theme$/, () => ({ op: 'updateThemeApi' })],
  ['GET', /^\/([^/]+)\/media-library$/, () => ({ op: 'fetchMediaLibraryApi' })],
  ['POST', /^\/([^/]+)\/upload-file$/, () => ({ op: 'uploadMediaFileApi' })],
  ['GET', /^\/([^/]+)\/puck-templates$/, () => ({ op: 'listPuckTemplatesApi' })],
  ['POST', /^\/([^/]+)\/puck-templates$/, () => ({ op: 'createPuckTemplateApi' })],
  ['DELETE', /^\/([^/]+)\/puck-templates\/([^/]+)$/, (m) => ({ op: 'deletePuckTemplateApi', key: m[2] })],
  [
    'POST',
    new RegExp(`^/([^/]+)/(published|preview)/${KIND}/query$`),
    (m) => ({ op: m[3] === 'puck-pages' ? 'queryPuckPageApi' : 'queryPuckContentApi', kind: m[3], mode: m[2] }),
  ],
  [
    'GET',
    new RegExp(`^/([^/]+)/(published|preview)/${KIND}/([^/]+)$`),
    (m) => ({
      op: `get${m[2] === 'published' ? 'Published' : 'Preview'}${m[3] === 'puck-pages' ? 'PuckPage' : 'PuckContent'}Api`,
      kind: m[3],
      mode: m[2],
      key: decodeURIComponent(m[4]),
    }),
  ],
  ['GET', new RegExp(`^/([^/]+)/${KIND}$`), (m) => ({ op: m[2] === 'puck-pages' ? 'listPuckPagesApi' : 'listPuckContentsApi', kind: m[2] })],
  ['POST', new RegExp(`^/([^/]+)/${KIND}$`), (m) => ({ op: m[2] === 'puck-pages' ? 'createPuckPageApi' : 'createPuckContentApi', kind: m[2] })],
  ['GET', new RegExp(`^/([^/]+)/${KIND}/([^/]+)$`), (m) => ({ op: m[2] === 'puck-pages' ? 'getPuckPageApi' : 'getPuckContentApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['PUT', new RegExp(`^/([^/]+)/${KIND}/([^/]+)$`), (m) => ({ op: m[2] === 'puck-pages' ? 'updatePuckPageApi' : 'updatePuckContentApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['DELETE', new RegExp(`^/([^/]+)/${KIND}/([^/]+)$`), (m) => ({ op: m[2] === 'puck-pages' ? 'deletePuckPageApi' : 'deletePuckContentApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['GET', new RegExp(`^/([^/]+)/${KIND}/([^/]+)/states$`), (m) => ({ op: m[2] === 'puck-pages' ? 'getPuckPageStatesApi' : 'getPuckContentStatesApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['PUT', new RegExp(`^/([^/]+)/${KIND}/([^/]+)/states/published$`), (m) => ({ op: m[2] === 'puck-pages' ? 'publishPuckPageApi' : 'publishPuckContentApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['DELETE', new RegExp(`^/([^/]+)/${KIND}/([^/]+)/states/draft$`), (m) => ({ op: m[2] === 'puck-pages' ? 'revertPuckPageDraftApi' : 'revertPuckContentDraftApi', kind: m[2], key: decodeURIComponent(m[3]) })],
  ['GET', new RegExp(`^/([^/]+)/${KIND}/([^/]+)/versions$`), (m) => ({ op: m[2] === 'puck-pages' ? 'getPuckPageVersionsApi' : 'getPuckContentVersionsApi', kind: m[2], key: decodeURIComponent(m[3]) })],
];

function match(method, path) {
  for (const [m, re, build] of routes) {
    if (m !== method) continue;
    const found = re.exec(path);
    if (found) {
      const route = build(found);
      return route.op === 'resolveDatasourceApi' ? route : { ...route, bu: found[1] };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const isPage = (kind) => kind === 'puck-pages';
const store0 = (store, kind) => (isPage(kind) ? store.pages : store.contents);
const dataField = (kind) => (isPage(kind) ? 'puckData' : 'data');

/** Mimics the server side embedding of `resolvedData` into datasource props. */
function embedProducts(node) {
  if (Array.isArray(node)) return node.map(embedProducts);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = embedProducts(v);
    if ((out.type === 'product-by-sku' || out.type === 'products-by-sku') && Array.isArray(out.skus)) {
      out.resolvedData = out.type === 'products-by-sku' ? out.skus.map(() => PRODUCT) : PRODUCT;
    }
    return out;
  }
  return node;
}

const withEmbedded = (kind, value) => ({ ...value, [dataField(kind)]: embedProducts(value[dataField(kind)]) });

const stateInfo = (item) => ({
  ...(item.draft ? { draft: item.draft } : {}),
  ...(item.published ? { published: item.published } : {}),
});

const ctObject = (item, value) => ({
  id: item.id,
  version: item.version,
  container: item.container,
  key: item.key,
  value: value ?? item.draft ?? item.published,
  createdAt: item.createdAt,
  lastModifiedAt: item.lastModifiedAt,
});

const listItem = (item) => ({ ...ctObject(item), states: stateInfo(item) });

function createItem(store, kind, bu, input) {
  const stamp = now();
  const key = slugify(input.name || 'untitled') || randomUUID();
  const items = store0(store, kind);
  if (items.has(key)) return null;
  const value = isPage(kind)
    ? {
        key,
        businessUnitKey: bu,
        name: input.name,
        slug: input.slug ?? `/${key}`,
        puckData: input.puckData ?? { root: { props: {} }, content: [] },
        ...(input.meta ? { meta: input.meta } : {}),
        createdAt: stamp,
        updatedAt: stamp,
      }
    : {
        key,
        businessUnitKey: bu,
        name: input.name,
        contentType: input.contentType ?? 'generic',
        data: input.data ?? { root: { props: {} }, content: [] },
        ...(input.meta ? { meta: input.meta } : {}),
        createdAt: stamp,
        updatedAt: stamp,
      };
  const item = record(kind, key, value);
  item.draft = value;
  items.set(key, item);
  return item;
}

function parseQuery(query, field) {
  const m = new RegExp(`^${field}\\s*=\\s*"(.*)"$`).exec(String(query ?? '').trim());
  return m ? m[1] : null;
}

export async function createMockServer(opts = {}) {
  const token = opts.token ?? process.env.MOCK_SERVICE_TOKEN ?? 'dev-token';
  const origin = opts.origin ?? process.env.MOCK_ORIGIN ?? 'http://localhost:5174';
  const mediaNone = (opts.media ?? process.env.MOCK_MEDIA) === 'none';
  const mediaMax = Number(opts.mediaMax ?? process.env.MOCK_MEDIA_MAX ?? 4);
  const publicDatasourceResolve =
    opts.publicDatasourceResolve ?? process.env.MOCK_PUBLIC_DATASOURCE_RESOLVE === 'true';

  let store = seed();
  let baseUrl = '';

  const isProtected = (route) => {
    if (PROTECTED_OPS.has(route.op)) return true;
    if (route.op === 'queryPuckPageApi' || route.op === 'queryPuckContentApi') return route.mode === 'preview';
    if (route.op === 'resolveDatasourceApi') {
      return !(publicDatasourceResolve && (route.key === 'product-by-sku' || route.key === 'products-by-sku'));
    }
    return false;
  };

  const handle = async (req, res, route, url) => {
    const body = await readBody(req);
    const bu = route.bu ?? BU;
    switch (route.op) {
      case 'health':
        return send(res, 200, { status: 'ok' });
      case 'reset':
        store = seed();
        return send(res, 200, { status: 'reset' });
      case 'searchProductsApi':
        return send(res, 200, SEARCH_RESULTS);
      case 'resolveDatasourceApi': {
        const params = body?.params ?? {};
        if (route.key === 'products-by-sku') {
          const skus = String(params.skus ?? '').split(',').filter(Boolean);
          return send(res, 200, skus.map((sku) => ({ ...PRODUCT, masterVariant: { ...PRODUCT.masterVariant, sku } })));
        }
        return send(res, 200, { ...PRODUCT, masterVariant: { ...PRODUCT.masterVariant, sku: params.sku ?? 'SKU-1' } });
      }
      case 'importDefaultContentTypesApi':
        return send(res, 200, { imported: ['hero', 'banner', 'card'], failed: [] });
      case 'getThemeApi':
        return store.theme ? send(res, 200, store.theme) : fail(res, 404, 'Theme not found');
      case 'createThemeApi':
      case 'updateThemeApi':
        store.theme = body?.value ?? {};
        return send(res, route.op === 'createThemeApi' ? 201 : 200, store.theme);
      case 'fetchMediaLibraryApi':
      case 'uploadMediaFileApi': {
        if (mediaNone) {
          return fail(res, 501, 'Media storage is not configured', 'MEDIA_NOT_CONFIGURED');
        }
        if (route.op === 'uploadMediaFileApi') {
          store.uploads += 1;
          const name = `upload-${store.uploads}.png`;
          return send(res, 201, {
            url: `${baseUrl}/files/${name}`,
            key: `media/${name}`,
            name,
            size: 1024,
            contentType: 'image/png',
          });
        }
        const extensions = (url.searchParams.get('extensions') ?? '').split(',').filter(Boolean);
        const files = extensions.length
          ? MEDIA_FILES.filter((f) => extensions.includes(f.name.split('.').pop()))
          : MEDIA_FILES;
        let offset = 0;
        const cursor = url.searchParams.get('cursor');
        if (cursor) {
          const decoded = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
          if (!Number.isInteger(decoded) || decoded < 0 || decoded > files.length) {
            return fail(res, 400, 'Invalid cursor', 'MEDIA_INVALID_CURSOR');
          }
          offset = decoded;
        }
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, mediaMax);
        const page = files.slice(offset, offset + limit);
        const next = offset + limit;
        const hasMore = next < files.length;
        return send(res, 200, {
          files: page,
          pagination: { limit, nextCursor: hasMore ? Buffer.from(String(next)).toString('base64url') : null, hasMore },
        });
      }
      case 'listPuckTemplatesApi': {
        const kind = url.searchParams.get('kind');
        return send(
          res,
          200,
          [...store.templates.values()].filter((t) => !kind || t.value.kind === kind)
        );
      }
      case 'createPuckTemplateApi': {
        const input = body?.value ?? {};
        const stamp = now();
        const key = slugify(input.name || 'template') || randomUUID();
        const template = {
          id: randomUUID(),
          version: 1,
          container: 'puck-templates',
          key,
          createdAt: stamp,
          lastModifiedAt: stamp,
          value: {
            key,
            businessUnitKey: bu,
            name: input.name,
            kind: input.kind ?? 'page',
            puckData: input.puckData ?? { root: { props: {} }, content: [] },
            createdAt: stamp,
            updatedAt: stamp,
          },
        };
        store.templates.set(key, template);
        return send(res, 201, template);
      }
      case 'deletePuckTemplateApi':
        return store.templates.delete(route.key) ? send(res, 204) : fail(res, 404, 'Template not found');
      default:
        return handleContent(req, res, route, url, body, bu);
    }
  };

  const handleContent = (req, res, route, url, body, bu) => {
    const { kind, key, mode } = route;
    const items = store0(store, kind);
    const notFound = () => fail(res, 404, `${isPage(kind) ? 'Page' : 'Content item'} not found`);

    if (route.op.startsWith('query')) {
      const query = body?.query;
      const found = [...items.values()].find((item) => {
        const value = mode === 'preview' ? item.draft ?? item.published : item.published;
        if (!value) return false;
        return isPage(kind) ? value.slug === parseQuery(query, 'slug') : value.contentType === parseQuery(query, 'contentType');
      });
      const value = found && (mode === 'preview' ? found.draft ?? found.published : found.published);
      return value ? send(res, 200, withEmbedded(kind, value)) : notFound();
    }
    if (route.op.startsWith('getPublished') || route.op.startsWith('getPreview')) {
      const item = items.get(key);
      const value = item && (mode === 'preview' ? item.draft ?? item.published : item.published);
      return value ? send(res, 200, withEmbedded(kind, value)) : notFound();
    }
    if (route.op.startsWith('list')) {
      const contentType = url.searchParams.get('contentType');
      return send(
        res,
        200,
        [...items.values()]
          .filter((item) => !contentType || (item.draft ?? item.published).contentType === contentType)
          .map(listItem)
      );
    }
    if (route.op.startsWith('create')) {
      const created = createItem(store, kind, bu, body?.value ?? {});
      return created ? send(res, 201, ctObject(created)) : fail(res, 409, 'An item with this key already exists');
    }

    const item = items.get(key);
    if (!item) return notFound();
    const stamp = now();
    const stateBody = () => ({ key, businessUnitKey: bu, states: stateInfo(item) });

    if (route.op.startsWith('get') && route.op.endsWith('StatesApi')) return send(res, 200, stateBody());
    if (route.op.endsWith('VersionsApi')) {
      return send(res, 200, { key, businessUnitKey: bu, versions: item.versions.map((v, i) => ({ ...v, version: i + 1 })) });
    }
    if (route.op.startsWith('publish')) {
      const source = item.draft ?? item.published;
      item.published = { ...source, updatedAt: stamp };
      item.versions.push({ ...item.published, id: randomUUID(), timestamp: stamp });
      item.versions = item.versions.slice(-20);
      if (url.searchParams.get('clearDraft') === 'true') item.draft = undefined;
      item.lastModifiedAt = stamp;
      return send(res, 200, stateBody());
    }
    if (route.op.startsWith('revert')) {
      item.draft = undefined;
      item.lastModifiedAt = stamp;
      return send(res, 200, stateBody());
    }
    if (route.op.startsWith('update')) {
      const base = item.draft ?? item.published;
      item.draft = { ...base, ...(body?.value ?? {}), key, businessUnitKey: bu, updatedAt: stamp };
      item.version += 1;
      item.lastModifiedAt = stamp;
      return send(res, 200, ctObject(item, item.draft));
    }
    if (route.op.startsWith('delete')) {
      items.delete(key);
      return send(res, 204);
    }
    if (route.op.startsWith('get')) return send(res, 200, listItem(item));
    return notFound();
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    cors(req, res, origin);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!url.pathname.startsWith(PREFIX)) return fail(res, 404, 'Not found');
    const route = match(req.method ?? 'GET', url.pathname.slice(PREFIX.length));
    if (!route) return fail(res, 404, 'Not found');
    if (isProtected(route) && req.headers.authorization !== `Bearer ${token}`) {
      return fail(res, 401, 'Authentication required', undefined, { 'WWW-Authenticate': 'Bearer realm="contentools"' });
    }
    try {
      await handle(req, res, route, url);
    } catch (error) {
      fail(res, 500, error instanceof Error ? error.message : 'Internal error');
    }
  });

  await new Promise((resolve) => server.listen(opts.port ?? 0, resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}${PREFIX}`;

  return {
    url: baseUrl,
    store: {
      reset: () => {
        store = seed();
      },
      get: () => store,
    },
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
