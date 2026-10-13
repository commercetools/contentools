/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** The base URL (CDN) wins over the provider's own URL. Segments are encoded; keys are already URL-safe. */
export function publicUrl(
  base: string | null,
  fallback: string,
  key: string
): string {
  if (!base) return fallback;
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${encoded}`;
}
