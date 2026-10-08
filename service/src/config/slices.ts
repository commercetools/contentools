/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export const DEFAULT_BUSINESS_UNIT_KEY = 'default';

export interface Slice {
  path: string;
  suffix: string;
  aggregateKey: string;
  shape: 'object' | 'array';
}

export const SLICES: readonly Slice[] = [
  { path: 'theme', suffix: 'theme', aggregateKey: 'theme', shape: 'object' },
  { path: 'header', suffix: 'header', aggregateKey: 'header', shape: 'object' },
  { path: 'facet', suffix: 'facet', aggregateKey: 'facetConfiguration', shape: 'object' },
  { path: 'footer', suffix: 'footer', aggregateKey: 'footer', shape: 'object' },
  { path: 'site-metadata', suffix: 'site-metadata', aggregateKey: 'siteMetadata', shape: 'object' },
  { path: 'category-listing', suffix: 'category-listing', aggregateKey: 'categoryListing', shape: 'object' },
  { path: 'translations', suffix: 'translations', aggregateKey: 'translations', shape: 'object' },
  { path: 'b2b-account-menu-links', suffix: 'b2b-account-menu-links', aggregateKey: 'b2bAccountMenuLinks', shape: 'array' },
];

/** Only read by the aggregate; it has no routes of its own. */
export const CONTENTOOLS_BASE_URL = {
  suffix: 'contentools-base-url',
  aggregateKey: 'contentoolsBaseUrl',
} as const;

export const sliceKey = (businessUnitKey: string, suffix: string): string =>
  `${businessUnitKey}-${suffix}`;
