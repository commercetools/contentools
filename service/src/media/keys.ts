/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { MediaError } from './errors';

export const BU_KEY_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

export function assertBusinessUnitKey(value: string): string {
  if (!BU_KEY_PATTERN.test(value)) {
    throw new MediaError(
      400,
      'MEDIA_INVALID_BUSINESS_UNIT',
      'Invalid business unit key'
    );
  }
  return value;
}

/** Returns the file name stem (no directory, no extension) restricted to [A-Za-z0-9._-]. */
export function sanitizeFileName(original: string): string {
  const base = path.posix.basename(original.replace(/\\/g, '/'));
  const stem = path.posix.parse(base).name;
  const cleaned = stem
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return cleaned || 'file';
}

/** Newest objects sort first in UTF-8 key order. */
export function reverseTimestamp(nowMs: number): string {
  return String(9999999999999 - nowMs).padStart(13, '0');
}

export function buildObjectKey(i: {
  prefix: string;
  businessUnitKey: string;
  stem: string;
  ext: string;
  nowMs: number;
  id: string;
}): string {
  return `${i.prefix}/${i.businessUnitKey}/${reverseTimestamp(i.nowMs)}-${i.id}-${i.stem}.${i.ext}`;
}

/** Trailing slash keeps business unit `a` from matching `ab`. */
export function listPrefix(prefix: string, businessUnitKey: string): string {
  return `${prefix}/${businessUnitKey}/`;
}

export function newObjectId(): string {
  return randomBytes(4).toString('hex');
}
