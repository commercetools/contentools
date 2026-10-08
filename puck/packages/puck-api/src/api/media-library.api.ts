/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  MediaLibraryResult,
  MediaUploadResult,
} from '@commercetools-labs/puck-types';
import type { PuckClient } from '../client/client';

export interface FetchMediaLibraryOptions {
  extensions?: string[];
  limit?: number;
  /** Opaque cursor from a previous page (`pagination.nextCursor`). */
  cursor?: string;
}

export const fetchMediaLibraryApi = (
  client: PuckClient,
  options: FetchMediaLibraryOptions = {}
) => {
  const { extensions = [], limit, cursor } = options;
  return client.request<MediaLibraryResult>(
    'fetchMediaLibraryApi',
    `/${client.businessUnitKey}/media-library`,
    {
      query: {
        extensions: extensions.length > 0 ? extensions.join(',') : undefined,
        limit,
        cursor,
      },
    }
  );
};

export const uploadMediaFileApi = (
  client: PuckClient,
  file: File,
  title?: string,
  description?: string
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  // No Content-Type header: the transport sets the multipart boundary.
  return client.request<MediaUploadResult>(
    'uploadMediaFileApi',
    `/${client.businessUnitKey}/upload-file`,
    { method: 'POST', body: formData }
  );
};
