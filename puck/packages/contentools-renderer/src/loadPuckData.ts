/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  getPreviewPuckContentApi,
  getPreviewPuckPageApi,
  getPublishedPuckContentApi,
  getPublishedPuckPageApi,
  queryPuckContentApi,
  queryPuckPageApi,
  type PuckClient,
} from '@commercetools-labs/contentools-api';
import type { PuckData } from '@commercetools-labs/contentools-types';

export interface LoadPuckDataTarget {
  type: 'page' | 'content';
  /** [type=page] Fetch by page key. */
  pageKey?: string;
  /** [type=page] OR fetch by slug. */
  slug?: string;
  /** [type=content] Fetch by content key. */
  contentKey?: string;
  /** [type=content] OR fetch by content type. */
  query?: string;
  /** `published` is public; `preview` needs authentication on the client. */
  mode: 'published' | 'preview';
}

/**
 * Loads the Puck data of a page or content item. React-free: usable in server code
 * (`getServerSideProps`, server components) with a client built by `createPuckClient`.
 * Resolves to `null` when nothing matches (or when no key/slug/query is given).
 */
export async function loadPuckData(
  client: PuckClient,
  target: LoadPuckDataTarget
): Promise<PuckData | null> {
  const { type, pageKey, slug, contentKey, query, mode } = target;

  if (type === 'content') {
    if (contentKey) {
      const value =
        mode === 'published'
          ? await getPublishedPuckContentApi(client, contentKey)
          : await getPreviewPuckContentApi(client, contentKey);
      return value.data;
    }
    if (query) {
      const value = await queryPuckContentApi(
        client,
        { query: `contentType = "${query}"` },
        mode
      );
      return value?.data ?? null;
    }
    return null;
  }

  if (pageKey) {
    const value =
      mode === 'published'
        ? await getPublishedPuckPageApi(client, pageKey)
        : await getPreviewPuckPageApi(client, pageKey);
    return value.puckData;
  }
  if (slug) {
    const value = await queryPuckPageApi(client, { query: `slug = "${slug}"` }, mode);
    return value?.puckData ?? null;
  }
  return null;
}
