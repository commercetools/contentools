/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

// Fixed-length digests make timingSafeEqual safe (it throws on unequal lengths).
const digest = (s: string) => createHash('sha256').update(s).digest();

/** The scheme is matched case-sensitively ("Bearer"); stricter than RFC 6750 on purpose. */
export function makeBearerMatcher(tokens: readonly string[]) {
  const accepted = tokens.map(digest);
  return (header: string | undefined): boolean => {
    const m = /^Bearer ([^\s]+)$/.exec(header ?? '');
    if (!m?.[1]) return false;
    const d = digest(m[1]);
    return accepted.reduce((ok, a) => timingSafeEqual(a, d) || ok, false);
  };
}
