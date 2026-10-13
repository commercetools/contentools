/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Request } from 'express';
import type { Configuration } from '../config/env';
import CustomError from '../errors/custom.error';
import { getLogger } from '../utils/logger.utils';
import { createMcVerifier, McAuthError } from './mc-verifier';
import type { Principal } from './principal';
import { matchesServiceToken } from './service-token';

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const REALM = 'Bearer realm="contentools"';

const missing = (): CustomError =>
  new CustomError(401, 'Authentication required', undefined, {
    headers: { 'WWW-Authenticate': REALM },
  });
const invalid = (): CustomError =>
  new CustomError(401, 'Invalid or expired credentials', undefined, {
    headers: { 'WWW-Authenticate': `${REALM}, error="invalid_token"` },
  });
const forbidden = (): CustomError => new CustomError(403, 'Forbidden');

export function createAuthenticator(config: Configuration) {
  const { auth, ctp } = config;
  const verifyMc = auth.mc ? createMcVerifier(auth.mc) : undefined;

  return async function authenticate(req: Request): Promise<Principal> {
    const header = req.headers.authorization;
    if (!header) throw missing();
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match?.[1]) {
      getLogger().warn('authentication failed', { reason: 'malformed-header' });
      throw invalid();
    }
    const credential = match[1];

    if (JWT_SHAPE.test(credential)) {
      if (!verifyMc) {
        getLogger().warn('authentication failed', {
          reason: 'mc-verification-not-configured',
        });
        throw invalid();
      }
      let session;
      try {
        session = await verifyMc({
          headers: req.headers,
          originalUrl: req.originalUrl,
        });
      } catch (error) {
        const failure =
          error instanceof McAuthError
            ? error
            : new McAuthError('invalid', 'UNKNOWN');
        getLogger().warn('authentication failed', { reason: failure.code });
        if (failure.reason === 'unavailable') {
          throw new CustomError(
            503,
            'Authentication service unavailable',
            undefined,
            { headers: { 'Retry-After': '5' } }
          );
        }
        throw invalid();
      }
      if (session.projectKey !== ctp.projectKey) {
        getLogger().warn('forbidden', { reason: 'other-project' });
        throw forbidden();
      }
      const permissions = session.userPermissions ?? [];
      const required = auth.mc?.requiredPermission;
      if (required && !permissions.includes(required)) {
        getLogger().warn('forbidden', { reason: 'missing-permission' });
        throw forbidden();
      }
      return {
        kind: 'merchant-center',
        userId: session.userId,
        projectKey: session.projectKey,
        permissions,
      };
    }

    if (
      auth.serviceToken &&
      matchesServiceToken(credential, auth.serviceToken)
    ) {
      return { kind: 'service-token' };
    }
    getLogger().warn('authentication failed', { reason: 'unknown-credential' });
    throw invalid();
  };
}
