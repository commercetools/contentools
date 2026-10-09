/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { buildToolset } from '../../src/adapters/options';

const base = { baseUrl: 'http://svc.test/service', token: 't' };

test('rejects a bad URL', () => {
  expect(() => buildToolset({ ...base, baseUrl: 'svc.test' })).toThrow(/http\(s\)/);
  expect(() => buildToolset({ ...base, baseUrl: '' })).toThrow(/http\(s\)/);
});

test('rejects an empty token', () => {
  expect(() => buildToolset({ ...base, token: '' })).toThrow(/token/);
});

test('defaults to the 24 read tools', () => {
  const { tools } = buildToolset(base);
  expect(tools).toHaveLength(24);
  expect(tools.every((t) => t.access === 'read')).toBe(true);
});

test('enableWrites exposes all 44', () => {
  expect(buildToolset({ ...base, enableWrites: true }).tools).toHaveLength(44);
});

test('groups filter', () => {
  const { tools } = buildToolset({ ...base, groups: ['pages'] });
  expect(tools).toHaveLength(8);
  expect(new Set(tools.map((t) => t.group))).toEqual(new Set(['pages']));
});
