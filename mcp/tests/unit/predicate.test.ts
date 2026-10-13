/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { ToolInputError, buildEqualsPredicate, quote } from '../../src/core/predicate';

test('plain value', () => expect(buildEqualsPredicate('slug', '/home')).toBe('slug = "/home"'));
test('embedded quote', () => expect(quote('a"b')).toBe('"a\\"b"'));
test('backslash', () => expect(quote('a\\b')).toBe('"a\\\\b"'));
test('backslash before quote is escaped in order', () => expect(quote('\\"')).toBe('"\\\\\\""'));
test('injection string', () => {
  expect(buildEqualsPredicate('slug', '/x" OR key = "y')).toBe('slug = "/x\\" OR key = \\"y"');
});
test('empty', () => expect(() => quote('')).toThrow(ToolInputError));
test('201 characters', () => expect(() => quote('a'.repeat(201))).toThrow(ToolInputError));
test('200 characters', () => expect(quote('a'.repeat(200))).toHaveLength(202));
test('newline', () => expect(() => quote('a\nb')).toThrow(ToolInputError));
test('NUL', () => expect(() => quote('a\u0000b')).toThrow(ToolInputError));
test('DEL', () => expect(() => quote('a\u007fb')).toThrow(ToolInputError));
