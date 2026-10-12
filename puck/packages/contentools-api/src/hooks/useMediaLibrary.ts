/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useRef, useState } from 'react';
import type {
  MediaFile,
  MediaLibraryPagination,
} from '@commercetools-labs/contentools-types';
import {
  fetchMediaLibraryApi,
  uploadMediaFileApi,
} from '../api/media-library.api';
import { PuckHttpError } from '../client/errors';
import { usePuckApiContext } from '../context/PuckApiContext';

interface MediaLibraryState {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  /** The service answered 501: no media provider is configured. */
  notConfigured: boolean;
}

const initialPagination: MediaLibraryPagination = {
  limit: 20,
  nextCursor: null,
  hasMore: false,
};

export interface UseMediaLibraryReturn {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  /** True when the installation has no media storage configured (not an error). */
  notConfigured: boolean;
  /** Loads the first page. */
  fetchMedia: (extensions?: string[], limit?: number) => Promise<void>;
  uploadFile: (
    file: File,
    title?: string,
    description?: string
  ) => Promise<MediaFile>;
  loadNextPage: (extensions?: string[]) => Promise<void>;
  loadPreviousPage: (extensions?: string[]) => Promise<void>;
  hasNextPage: () => boolean;
  hasPreviousPage: () => boolean;
}

export const useMediaLibrary = (): UseMediaLibraryReturn => {
  const { client } = usePuckApiContext();

  const [state, setState] = useState<MediaLibraryState>({
    files: [],
    pagination: initialPagination,
    loading: false,
    uploading: false,
    error: null,
    notConfigured: false,
  });

  // Cursors are opaque and forward-only: "previous" re-requests the cursor that produced the previous page.
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([]);
  const currentCursor = useRef<string | undefined>(undefined);

  const loadPage = useCallback(
    async (
      extensions: string[],
      limit: number,
      cursor: string | undefined
    ): Promise<void> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fetchMediaLibraryApi(client, {
          extensions,
          limit,
          cursor,
        });
        currentCursor.current = cursor;
        setState((s) => ({
          ...s,
          files: result.files,
          pagination: result.pagination,
          loading: false,
          notConfigured: false,
        }));
      } catch (err) {
        if (err instanceof PuckHttpError && err.status === 501) {
          setState((s) => ({
            ...s,
            files: [],
            loading: false,
            error: null,
            notConfigured: true,
          }));
          return;
        }
        setState((s) => ({
          ...s,
          loading: false,
          notConfigured: false,
          error: (err as Error).message,
        }));
      }
    },
    [client]
  );

  const fetchMedia = useCallback(
    async (extensions: string[] = [], limit = 20): Promise<void> => {
      setCursorStack([]);
      await loadPage(extensions, limit, undefined);
    },
    [loadPage]
  );

  const uploadFile = useCallback(
    async (
      file: File,
      title?: string,
      description?: string
    ): Promise<MediaFile> => {
      setState((s) => ({ ...s, uploading: true, error: null }));
      try {
        const result = await uploadMediaFileApi(
          client,
          file,
          title,
          description
        );
        const mediaFile: MediaFile = {
          url: result.url,
          key: result.key,
          name: result.name || file.name,
          title: title ?? file.name,
          description,
          isImage: (result.contentType || file.type).startsWith('image/'),
          contentType: result.contentType || file.type,
          createdAt: new Date().toISOString(),
          size: result.size ?? file.size,
        };
        setState((s) => ({
          ...s,
          files: [mediaFile, ...s.files],
          uploading: false,
        }));
        return mediaFile;
      } catch (err) {
        setState((s) => ({
          ...s,
          uploading: false,
          error: (err as Error).message,
        }));
        throw err;
      }
    },
    [client]
  );

  const loadNextPage = useCallback(
    async (extensions: string[] = []): Promise<void> => {
      const { hasMore, nextCursor, limit } = state.pagination;
      if (!hasMore || !nextCursor) return;
      const pageCursor = currentCursor.current; // read now: the ref changes when the next page loads
      setCursorStack((stack) => [...stack, pageCursor]);
      await loadPage(extensions, limit, nextCursor);
    },
    [loadPage, state.pagination]
  );

  const loadPreviousPage = useCallback(
    async (extensions: string[] = []): Promise<void> => {
      if (cursorStack.length === 0) return;
      const previous = cursorStack[cursorStack.length - 1];
      setCursorStack(cursorStack.slice(0, -1));
      await loadPage(extensions, state.pagination.limit, previous);
    },
    [loadPage, cursorStack, state.pagination.limit]
  );

  const hasNextPage = useCallback(
    () => state.pagination.hasMore && state.pagination.nextCursor !== null,
    [state.pagination]
  );

  const hasPreviousPage = useCallback(
    () => cursorStack.length > 0,
    [cursorStack]
  );

  return {
    files: state.files,
    pagination: state.pagination,
    loading: state.loading,
    uploading: state.uploading,
    error: state.error,
    notConfigured: state.notConfigured,
    fetchMedia,
    uploadFile,
    loadNextPage,
    loadPreviousPage,
    hasNextPage,
    hasPreviousPage,
  };
};
