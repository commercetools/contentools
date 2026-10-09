/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { ALL_TOOLS, parseGroups, selectTools } from '../../src/core';
import { EXPECTED } from '../support/catalog-fixture';

const ctx = { defaultBusinessUnitKey: 'default' };
const find = (name: string) => ALL_TOOLS.find((t) => t.name === name)!;
const build = (name: string, input: unknown) =>
  find(name).request(z.object(find(name).shape).strict().parse(input), ctx);

test('catalog equals the contract', () => {
  expect(ALL_TOOLS.map((t) => t.name).sort()).toEqual(EXPECTED.map((e) => e.name).sort());
  expect(ALL_TOOLS).toHaveLength(44);
  expect(ALL_TOOLS.filter((t) => t.access === 'read')).toHaveLength(24);
  expect(ALL_TOOLS.filter((t) => t.access === 'write')).toHaveLength(20);
  for (const e of EXPECTED) expect(find(e.name).access).toBe(e.access);
});

test('names are snake_case and unique', () => {
  const names = ALL_TOOLS.map((t) => t.name);
  expect(new Set(names).size).toBe(names.length);
  for (const n of names) expect(n).toMatch(/^[a-z]+(_[a-z0-9]+)*$/);
});

test.each(EXPECTED)('$name builds $method $path', (e) => {
  const req = build(e.name, e.input);
  expect([req.method, req.path, req.body]).toEqual([e.method, e.path, e.body]);
});

test('upload_media builds multipart', () => {
  const req = build('upload_media', { fileName: 'a.png', fileContentBase64: 'AAAA', title: 'T' });
  expect(req.multipart).toEqual({
    fields: { title: 'T', description: '' },
    file: { name: 'a.png', contentBase64: 'AAAA' },
  });
});

test('upload_media rejects files over 5 MiB', () => {
  const big = 'A'.repeat(Math.ceil((5 * 1024 * 1024 * 4) / 3) + 8);
  expect(() => build('upload_media', { fileName: 'a.png', fileContentBase64: big })).toThrow(
    /5 MiB/
  );
});

test('no legacy surface', () => {
  const legacy = new RegExp(['content-items', '/pages', 'page-items', 'proxy-script', 'compile-upload', 'authenticate-' + 'project', 'refresh-' + 'jwt'].join('|'));
  for (const e of EXPECTED) {
    const req = build(e.name, e.input);
    expect(req.path).not.toMatch(legacy);
  }
  for (const t of ALL_TOOLS) expect(t.name).not.toMatch(legacy);
});

test('schemas reject credentials', () => {
  for (const t of ALL_TOOLS) {
    const keys = Object.keys(t.shape);
    for (const forbidden of ['jwtToken', 'projectKey', 'baseUrl', 'token']) {
      expect(keys).not.toContain(forbidden);
    }
    expect(z.object(t.shape).strict().safeParse({ jwtToken: 'x' }).success).toBe(false);
  }
});

test('path segments are encoded and the business unit can be overridden', () => {
  const req = build('get_puck_page', { key: 'a/b c', businessUnitKey: 'bu 1' });
  expect(req.path).toBe('/bu%201/puck-pages/a%2Fb%20c');
});

test('query injection is escaped; control characters rejected', () => {
  expect(build('query_published_puck_page', { slug: '/x" OR key = "y' }).body).toEqual({
    query: 'slug = "/x\\" OR key = \\"y"',
  });
  expect(() => build('query_published_puck_page', { slug: '/x\ny' })).toThrow();
});

test('update tools require at least one field; list_media rejects page', () => {
  expect(z.object(find('update_puck_page').shape).safeParse({ key: 'a', value: {} }).success).toBe(false);
  expect(z.object(find('list_media').shape).strict().safeParse({ page: 2 }).success).toBe(false);
});

test('selectTools', () => {
  expect(selectTools({ groups: 'all', enableWrites: false })).toHaveLength(24);
  expect(selectTools({ groups: 'all', enableWrites: true })).toHaveLength(44);
  expect(selectTools({ groups: ['pages', 'products'], enableWrites: false })).toHaveLength(9);
  expect(selectTools({ groups: ['pages', 'products'], enableWrites: true })).toHaveLength(14);
});

test('parseGroups', () => {
  expect(parseGroups(undefined)).toBe('all');
  expect(parseGroups('')).toBe('all');
  expect(parseGroups('all')).toBe('all');
  expect(parseGroups('pages, media')).toEqual(['pages', 'media']);
  expect(() => parseGroups('nope')).toThrow(/nope/);
});
