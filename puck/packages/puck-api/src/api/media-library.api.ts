import type { MediaLibraryResult } from '@commercetools-demo/puck-types';
import { httpClient } from './http-client';

export const fetchMediaLibraryApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  jwtToken?: string,
  extensions: string[] = [],
  page = 1,
  limit = 20
): Promise<MediaLibraryResult> => {
  const params = new URLSearchParams();
  if (extensions.length > 0) params.set('extensions', extensions.join(','));
  params.set('page', String(page));
  params.set('limit', String(limit));

  const headers: Record<string, string> = { 'x-project-key': projectKey };
  if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

  return httpClient<MediaLibraryResult>(
    `${baseURL}/${businessUnitKey}/media-library?${params}`,
    { headers }
  );
};

export const uploadMediaFileApi = async (
  baseURL: string,
  projectKey: string,
  businessUnitKey: string,
  jwtToken: string,
  file: File,
  title?: string,
  description?: string
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  // No Content-Type header — browser sets multipart/form-data boundary automatically
  return httpClient<{ url: string }>(
    `${baseURL}/${businessUnitKey}/upload-file`,
    {
      method: 'POST',
      headers: { 'x-project-key': projectKey, Authorization: `Bearer ${jwtToken}` },
      body: formData,
    }
  );
};
