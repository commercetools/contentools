/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

type ErrorItem = {
  statusCode: number | string;
  message: string;
  referencedBy?: string;
};

class CustomError extends Error {
  statusCode: number | string;
  message: string;
  errors?: ErrorItem[];
  code?: string;
  headers?: Record<string, string>;

  constructor(
    statusCode: number | string,
    message: string,
    errors?: ErrorItem[],
    extra?: string | { headers?: Record<string, string>; code?: string }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    if (errors) {
      this.errors = errors;
    }
    const options = typeof extra === 'string' ? { code: extra } : extra;
    if (options?.code) {
      this.code = options.code;
    }
    if (options?.headers) {
      this.headers = options.headers;
    }
  }
}

export default CustomError;
