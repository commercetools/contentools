/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export interface PuckHttpErrorInit {
  status: number;
  statusText: string;
  body: string;
  url: string;
  method: string;
}

interface ServiceErrorBody {
  serverMessage?: string;
  code?: string;
  correlationId?: string;
  errors?: unknown;
}

/** Tolerant parse of the service error envelope `{ message, statusCode, correlationId, code?, errors? }`. */
const parseErrorBody = (body: string): ServiceErrorBody => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    const text = (value: unknown): string | undefined =>
      typeof value === 'string' ? value : undefined;
    return {
      serverMessage: text(record.message),
      code: text(record.code),
      correlationId: text(record.correlationId),
      errors: record.errors,
    };
  } catch {
    return {};
  }
};

export class PuckHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
  readonly url: string;
  readonly method: string;
  /** `message` of the service error envelope, when the body had one. */
  readonly serverMessage?: string;
  /** Service error code (for example `MEDIA_NOT_CONFIGURED`), when present. */
  readonly code?: string;
  readonly correlationId?: string;
  readonly errors?: unknown;

  constructor(init: PuckHttpErrorInit) {
    const parsed = parseErrorBody(init.body);
    super(
      `[contentools-api] HTTP ${init.status}: ${parsed.serverMessage ?? (init.body || init.statusText)}`
    );
    this.name = 'PuckHttpError';
    this.status = init.status;
    this.statusText = init.statusText;
    this.body = init.body;
    this.url = init.url;
    this.method = init.method;
    this.serverMessage = parsed.serverMessage;
    this.code = parsed.code;
    this.correlationId = parsed.correlationId;
    this.errors = parsed.errors;
  }
}

export type PuckAuthCode = 'PUCK_AUTH_REQUIRED' | 'PUCK_AUTH_REJECTED';

/**
 * Authentication failed. `authCode` is client side: `PUCK_AUTH_REQUIRED` (no auth source configured,
 * nothing was sent) or `PUCK_AUTH_REJECTED` (the service answered 401 or 403).
 */
export class PuckAuthError extends PuckHttpError {
  readonly authCode: PuckAuthCode;

  constructor(init: PuckHttpErrorInit, authCode: PuckAuthCode) {
    super(init);
    this.name = 'PuckAuthError';
    this.authCode = authCode;
  }
}

/** Error thrown before any I/O when a protected call has no auth source. */
export const authRequiredError = (url: string, method: string): PuckAuthError =>
  new PuckAuthError(
    {
      status: 401,
      statusText: 'Unauthorized',
      body: 'auth required: configure jwtToken, getAuthHeaders or fetcher',
      url,
      method,
    },
    'PUCK_AUTH_REQUIRED'
  );
