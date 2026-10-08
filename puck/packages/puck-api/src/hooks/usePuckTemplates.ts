import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckTemplateInput,
  PuckTemplateKind,
  PuckTemplateListItem,
  PuckTemplateResponse,
} from '@commercetools-demo/puck-types';
import {
  createPuckTemplateApi,
  deletePuckTemplateApi,
  listPuckTemplatesApi,
} from '../api/puck-templates.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckTemplatesReturn {
  templates: PuckTemplateListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTemplate: (
    input: CreatePuckTemplateInput
  ) => Promise<PuckTemplateResponse>;
  deleteTemplate: (key: string) => Promise<void>;
}

/**
 * Lists templates for the current business unit, filtered by `kind`
 * (`page` | `content`), and exposes create/delete. Templates are plain custom
 * objects — no draft/published states or version history.
 */
export const usePuckTemplates = (
  kind?: PuckTemplateKind
): UsePuckTemplatesReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [templates, setTemplates] = useState<PuckTemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPuckTemplatesApi(
        baseURL,
        projectKey,
        businessUnitKey,
        kind
      );
      setTemplates(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey, kind]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTemplate = useCallback(
    async (input: CreatePuckTemplateInput): Promise<PuckTemplateResponse> => {
      if (!jwtToken) throw new Error('jwtToken is required to create a template');
      const created = await createPuckTemplateApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        { value: input }
      );
      await refresh();
      return created;
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, refresh]
  );

  const deleteTemplate = useCallback(
    async (key: string): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to delete a template');
      await deletePuckTemplateApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        key
      );
      await refresh();
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, refresh]
  );

  return { templates, loading, error, refresh, createTemplate, deleteTemplate };
};
