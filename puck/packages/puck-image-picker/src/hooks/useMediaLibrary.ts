import { useCallback, useState } from 'react';
import type {
  MediaFile,
  MediaLibraryPagination,
} from '../types';
import {
  fetchMediaLibraryApi,
  uploadMediaFileApi,
} from '../api/media-library.api';
import { useImagePickerContext } from '../context/ImagePickerContext';

interface MediaLibraryState {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialPagination: MediaLibraryPagination = {
  totalItems: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 20,
};

export interface UseMediaLibraryReturn {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  fetchMedia: (
    extensions?: string[],
    page?: number,
    limit?: number
  ) => Promise<void>;
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
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    useImagePickerContext();

  const [state, setState] = useState<MediaLibraryState>({
    files: [],
    pagination: initialPagination,
    loading: false,
    uploading: false,
    error: null,
  });

  const fetchMedia = useCallback(
    async (
      extensions: string[] = [],
      page = 1,
      limit = 20
    ): Promise<void> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fetchMediaLibraryApi(
          baseURL,
          projectKey,
          businessUnitKey,
          jwtToken,
          extensions,
          page,
          limit
        );
        setState((s) => ({
          ...s,
          files: result.files,
          pagination: result.pagination,
          loading: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: (err as Error).message,
        }));
      }
    },
    [baseURL, projectKey, businessUnitKey, jwtToken]
  );

  const uploadFile = useCallback(
    async (
      file: File,
      title?: string,
      description?: string
    ): Promise<MediaFile> => {
      if (!jwtToken) throw new Error('jwtToken is required to upload files');
      setState((s) => ({ ...s, uploading: true, error: null }));
      try {
        const result = await uploadMediaFileApi(
          baseURL,
          projectKey,
          businessUnitKey,
          jwtToken,
          file,
          title,
          description
        );
        const mediaFile: MediaFile = {
          url: result.url,
          name: file.name,
          title: title ?? file.name,
          description,
          isImage: file.type.startsWith('image/'),
          createdAt: new Date().toISOString(),
          size: file.size,
        };
        setState((s) => ({
          ...s,
          files: [mediaFile, ...s.files],
          pagination: {
            ...s.pagination,
            totalItems: s.pagination.totalItems + 1,
          },
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
    [baseURL, projectKey, businessUnitKey, jwtToken]
  );

  const loadNextPage = useCallback(
    async (extensions: string[] = []): Promise<void> => {
      const next = state.pagination.currentPage + 1;
      if (next <= state.pagination.totalPages) {
        await fetchMedia(extensions, next, state.pagination.limit);
      }
    },
    [fetchMedia, state.pagination]
  );

  const loadPreviousPage = useCallback(
    async (extensions: string[] = []): Promise<void> => {
      const prev = state.pagination.currentPage - 1;
      if (prev >= 1) {
        await fetchMedia(extensions, prev, state.pagination.limit);
      }
    },
    [fetchMedia, state.pagination]
  );

  const hasNextPage = useCallback(
    () => state.pagination.currentPage < state.pagination.totalPages,
    [state.pagination]
  );

  const hasPreviousPage = useCallback(
    () => state.pagination.currentPage > 1,
    [state.pagination]
  );

  return {
    files: state.files,
    pagination: state.pagination,
    loading: state.loading,
    uploading: state.uploading,
    error: state.error,
    fetchMedia,
    uploadFile,
    loadNextPage,
    loadPreviousPage,
    hasNextPage,
    hasPreviousPage,
  };
};
