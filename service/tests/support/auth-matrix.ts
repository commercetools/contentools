/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export type TokenFactory = (kind: string) => Promise<string | undefined>;

export const authRejectionCases = ['missing', 'malformed', 'alg-none', 'wrong-signature', 'wrong-issuer', 'wrong-audience', 'expired'] as const;

/** Spec E calls this with a factory that mints each kind of bad token; every case must yield 401 (never 200/500). */
export function runAuthRejectionMatrix(call: (authHeader: string | undefined) => Promise<{ status: number }>, make: TokenFactory): void {
  describe.each(authRejectionCases)('auth rejection: %s', (kind) => {
    it('is rejected with 401', async () => {
      const token = await make(kind);
      const res = await call(token === undefined ? undefined : `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });
}
