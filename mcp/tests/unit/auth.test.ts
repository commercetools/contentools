/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { makeBearerMatcher } from '../../src/server/auth';

const OK = 'a'.repeat(40);
const OLD = 'b'.repeat(40);

test.each<[string, string | undefined]>([
  ['undefined', undefined],
  ['empty', ''],
  ['Basic', 'Basic x'],
  ['scheme only', 'Bearer'],
  ['scheme and space', 'Bearer '],
  ['lowercase scheme', `bearer ${OK}`],
  ['wrong token', 'Bearer wrong'],
  ['prefix of the token', `Bearer ${OK.slice(0, 39)}`],
  ['trailing space', `Bearer ${OK} `],
  ['inner space', `Bearer ${OK.slice(0, 10)} ${OK.slice(10)}`],
  ['extended token', `Bearer ${OK}x`],
])('rejects %s', (_label, header) => {
  expect(makeBearerMatcher([OK])(header)).toBe(false);
});

test('accepts the token', () => expect(makeBearerMatcher([OK])(`Bearer ${OK}`)).toBe(true));

test('accepts either rotation token', () => {
  const m = makeBearerMatcher([OK, OLD]);
  expect(m(`Bearer ${OK}`)).toBe(true);
  expect(m(`Bearer ${OLD}`)).toBe(true);
  expect(m(`Bearer ${'c'.repeat(40)}`)).toBe(false);
});
