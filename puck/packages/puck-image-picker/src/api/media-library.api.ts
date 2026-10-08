import type { MediaLibraryResult } from '../types';

/**
 * Fetch media library files for a business unit.
 * Maps to GET /service/:businessUnitKey/media-library
 */
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

  const headers: Record<string, string> = {
    'x-project-key': projectKey,
  };
  if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

  const res = await fetch(
    `${baseURL}/${businessUnitKey}/media-library?${params}`,
    { headers }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[puck-image-picker] HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<MediaLibraryResult>;
};

/**
 * Upload a file for a business unit.
 * Maps to POST /service/:businessUnitKey/upload-file
 */
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

  const res = await fetch(
    `${baseURL}/${businessUnitKey}/upload-file`,
    {
      method: 'POST',
      headers: {
        'x-project-key': projectKey,
        Authorization: `Bearer ${jwtToken}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[puck-image-picker] HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<{ url: string }>;
};
