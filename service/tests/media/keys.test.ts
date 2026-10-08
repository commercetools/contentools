/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  assertBusinessUnitKey,
  buildObjectKey,
  listPrefix,
  newObjectId,
  reverseTimestamp,
  sanitizeFileName,
} from '../../src/media/keys';

describe('media keys', () => {
  it('sanitizes names to a safe stem', () => {
    expect(sanitizeFileName('Summer Sale (1).PNG')).toBe('Summer-Sale-1');
    expect(sanitizeFileName('../../etc/passwd.png')).toBe('passwd');
    expect(sanitizeFileName('C:\\x\\y\\pic.jpg')).toBe('pic');
    expect(sanitizeFileName('日本語.png')).toBe('file');
    expect(sanitizeFileName('a'.repeat(200) + '.png')).toHaveLength(80);
  });

  it('builds the documented key shape', () => {
    expect(
      buildObjectKey({
        prefix: 'contentools/media',
        businessUnitKey: 'main-bu',
        stem: 'Summer-Sale-1',
        ext: 'png',
        nowMs: 1767225600000,
        id: '1a2b3c4d',
      })
    ).toBe(
      'contentools/media/main-bu/8232774399999-1a2b3c4d-Summer-Sale-1.png'
    );
  });

  it('newer objects sort first', () => {
    expect(reverseTimestamp(2000) < reverseTimestamp(1000)).toBe(true);
  });

  it('list prefixes of a and ab do not overlap', () => {
    expect('x/ab/1.png'.startsWith(listPrefix('x', 'a'))).toBe(false);
    expect('x/a/1.png'.startsWith(listPrefix('x', 'a'))).toBe(true);
  });

  it('validates business unit keys', () => {
    expect(assertBusinessUnitKey('main_bu-1')).toBe('main_bu-1');
    for (const bad of ['a..b', '../x', 'a/b', '', 'x'.repeat(257), 'a b']) {
      expect(() => assertBusinessUnitKey(bad)).toThrow(
        expect.objectContaining({ mediaCode: 'MEDIA_INVALID_BUSINESS_UNIT' })
      );
    }
  });

  it('ids are 8 hex characters', () => {
    expect(newObjectId()).toMatch(/^[0-9a-f]{8}$/);
  });
});
