/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  canonicalMime,
  extensionFor,
  isImageMime,
  parseAllowedMimeTypes,
  sniffMime,
} from '../../src/media/mime';

const hex = (s: string): Buffer => Buffer.from(s.replace(/\s/g, ''), 'hex');

describe('mime', () => {
  const samples: Array<[string, Buffer]> = [
    ['image/jpeg', hex('ffd8ffe000104a464946')],
    ['image/png', hex('89504e470d0a1a0a0000000d')],
    ['image/gif', Buffer.from('GIF89a......')],
    ['image/gif', Buffer.from('GIF87a......')],
    [
      'image/webp',
      Buffer.concat([
        Buffer.from('RIFF'),
        hex('24000000'),
        Buffer.from('WEBPVP8 '),
      ]),
    ],
    ['image/avif', Buffer.concat([hex('00000020'), Buffer.from('ftypavif')])],
    ['image/avif', Buffer.concat([hex('00000020'), Buffer.from('ftypavis')])],
    ['application/pdf', Buffer.from('%PDF-1.7\n')],
    [
      'image/svg+xml',
      Buffer.from('  <svg xmlns="http://www.w3.org/2000/svg"/>'),
    ],
    ['image/svg+xml', Buffer.from('<?xml version="1.0"?><svg/>')],
  ];

  it.each(samples)('sniffs %s', (type, buf) => {
    expect(sniffMime(buf)).toBe(type);
  });

  it('returns null for unknown content', () => {
    expect(sniffMime(Buffer.from('<html><body>hi</body></html>'))).toBeNull();
    expect(sniffMime(Buffer.from('<?xml version="1.0"?><note/>'))).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
    expect(sniffMime(hex('ffd8'))).toBeNull();
  });

  it('parses the allowlist', () => {
    expect([...parseAllowedMimeTypes('image/png, IMAGE/JPEG,,')]).toEqual([
      'image/png',
      'image/jpeg',
    ]);
    expect(() => parseAllowedMimeTypes('image/png,nonsense')).toThrow();
  });

  it('canonicalizes declared types', () => {
    expect(canonicalMime('image/jpg')).toBe('image/jpeg');
    expect(canonicalMime('Text/Plain; charset=UTF-8')).toBe('text/plain');
  });

  it('maps extensions and image flags', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/svg+xml')).toBe('svg');
    expect(extensionFor('application/pdf')).toBe('pdf');
    expect(isImageMime('image/png')).toBe(true);
    expect(isImageMime('application/pdf')).toBe(false);
  });
});
