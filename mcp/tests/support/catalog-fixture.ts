/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
export interface Expected {
  name: string;
  access: 'read' | 'write';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  input: Record<string, unknown>;
  body?: unknown;
}

const PUCK = { content: [{ type: 'Hero', props: { id: 'h1' } }], root: {} };
const row = (
  name: string,
  access: 'read' | 'write',
  method: Expected['method'],
  path: string,
  input: Record<string, unknown> = {},
  body?: unknown
): Expected => ({ name, access, method, path, input, body });

const PAGE = { name: 'Home', slug: '/home', puckData: PUCK };
const CONTENT = { name: 'Banner', contentType: 'banner', data: PUCK };
const DS = {
  name: 'Feed',
  key: 'feed',
  params: [{ key: 'sku', type: 'string', required: true }],
  deployedUrl: 'https://example.com/feed',
};

export const EXPECTED: Expected[] = [
  row('list_puck_pages', 'read', 'GET', '/default/puck-pages'),
  row('get_puck_page', 'read', 'GET', '/default/puck-pages/home', { key: 'home' }),
  row('get_published_puck_page', 'read', 'GET', '/default/published/puck-pages/home', { key: 'home' }),
  row('get_preview_puck_page', 'read', 'GET', '/default/preview/puck-pages/home', { key: 'home' }),
  row('query_published_puck_page', 'read', 'POST', '/default/published/puck-pages/query', { slug: '/home' }, { query: 'slug = "/home"' }),
  row('query_preview_puck_page', 'read', 'POST', '/default/preview/puck-pages/query', { slug: '/home' }, { query: 'slug = "/home"' }),
  row('get_puck_page_states', 'read', 'GET', '/default/puck-pages/home/states', { key: 'home' }),
  row('get_puck_page_versions', 'read', 'GET', '/default/puck-pages/home/versions', { key: 'home' }),
  row('create_puck_page', 'write', 'POST', '/default/puck-pages', { value: PAGE }, { value: PAGE }),
  row('update_puck_page', 'write', 'PUT', '/default/puck-pages/home', { key: 'home', value: { name: 'New' } }, { value: { name: 'New' } }),
  row('delete_puck_page', 'write', 'DELETE', '/default/puck-pages/home', { key: 'home' }),
  row('publish_puck_page', 'write', 'PUT', '/default/puck-pages/home/states/published', { key: 'home' }),
  row('revert_puck_page_draft', 'write', 'DELETE', '/default/puck-pages/home/states/draft', { key: 'home' }),

  row('list_puck_contents', 'read', 'GET', '/default/puck-contents?contentType=banner', { contentType: 'banner' }),
  row('get_puck_content', 'read', 'GET', '/default/puck-contents/b1', { key: 'b1' }),
  row('get_published_puck_content', 'read', 'GET', '/default/published/puck-contents/b1', { key: 'b1' }),
  row('get_preview_puck_content', 'read', 'GET', '/default/preview/puck-contents/b1', { key: 'b1' }),
  row('query_published_puck_content', 'read', 'POST', '/default/published/puck-contents/query', { field: 'contentType', value: 'banner' }, { query: 'contentType = "banner"' }),
  row('query_preview_puck_content', 'read', 'POST', '/default/preview/puck-contents/query', { field: 'name', value: 'Banner' }, { query: 'name = "Banner"' }),
  row('get_puck_content_states', 'read', 'GET', '/default/puck-contents/b1/states', { key: 'b1' }),
  row('get_puck_content_versions', 'read', 'GET', '/default/puck-contents/b1/versions', { key: 'b1' }),
  row('create_puck_content', 'write', 'POST', '/default/puck-contents', { value: CONTENT }, { value: CONTENT }),
  row('update_puck_content', 'write', 'PUT', '/default/puck-contents/b1', { key: 'b1', value: { name: 'New' } }, { value: { name: 'New' } }),
  row('delete_puck_content', 'write', 'DELETE', '/default/puck-contents/b1', { key: 'b1' }),
  row('publish_puck_content', 'write', 'PUT', '/default/puck-contents/b1/states/published?clearDraft=true', { key: 'b1', clearDraft: true }),
  row('revert_puck_content_draft', 'write', 'DELETE', '/default/puck-contents/b1/states/draft', { key: 'b1' }),

  row('list_puck_templates', 'read', 'GET', '/default/puck-templates?kind=page', { kind: 'page' }),
  row('get_puck_template', 'read', 'GET', '/default/puck-templates/t1', { key: 't1' }),
  row('create_puck_template', 'write', 'POST', '/default/puck-templates', { value: { name: 'T', kind: 'page', puckData: PUCK } }, { value: { name: 'T', kind: 'page', puckData: PUCK } }),
  row('delete_puck_template', 'write', 'DELETE', '/default/puck-templates/t1', { key: 't1' }),

  row('list_configurations', 'read', 'GET', '/default/configuration'),
  row('get_configuration', 'read', 'GET', '/default/configuration/theme', { slice: 'theme' }),
  row('upsert_configuration', 'write', 'PUT', '/default/configuration/theme', { slice: 'theme', value: { primary: '#fff' } }, { value: { primary: '#fff' } }),
  row('delete_configuration', 'write', 'DELETE', '/default/configuration/b2b-account-menu-links', { slice: 'b2b-account-menu-links' }),

  row('list_datasources', 'read', 'GET', '/datasource'),
  row('get_datasource', 'read', 'GET', '/datasource/feed', { key: 'feed' }),
  row('create_datasource', 'write', 'POST', '/datasource/feed', { key: 'feed', value: DS }, { value: DS }),
  row('update_datasource', 'write', 'PUT', '/datasource/feed', { key: 'feed', value: DS }, { value: DS }),
  row('delete_datasource', 'write', 'DELETE', '/datasource/feed', { key: 'feed' }),
  row('test_datasource', 'write', 'POST', '/datasource/feed/test', { key: 'feed', params: { sku: 'x' } }, { params: { sku: 'x' } }),

  row('search_products', 'read', 'GET', '/products/search?text=shirt&limit=5&locale=en-US', { text: 'shirt', limit: 5, locale: 'en-US' }),
  row('list_media', 'read', 'GET', '/default/media-library?limit=20&cursor=abc&extensions=png%2Cjpg', { limit: 20, cursor: 'abc', extensions: ['png', 'jpg'] }),
  row('upload_media', 'write', 'POST', '/default/upload-file', { fileName: 'a.png', fileContentBase64: 'AAAA' }),
  row('import_default_content_types', 'write', 'POST', '/default/content-type/import', {}, {}),
];
