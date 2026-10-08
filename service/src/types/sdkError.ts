/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export class SDKError extends Error {
  constructor(message: string, error: any) {
    const details = error.body?.errors
      ?.map((e: any) => e.detailedErrorMessage || e.message)
      .filter((item: string) => !!item);
    const errorMessage =
      message + (details?.length ? ` ${details.join(', ')}` : '');

    super(errorMessage);
    this.name = 'SDKError';
  }
}
