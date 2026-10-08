/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string): Buffer =>
  createHash('sha256').update(value, 'utf8').digest();

/** Compares SHA-256 digests (equal length) in constant time, so any input length is safe. */
export const matchesServiceToken = (
  presented: string,
  expected: string
): boolean => timingSafeEqual(digest(presented), digest(expected));
