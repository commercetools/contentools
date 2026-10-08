/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePuckTemplateInput,
  PuckTemplateKind,
  PuckTemplateListItem,
  PuckTemplateResponse,
} from '@commercetools-labs/puck-types';
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
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [templates, setTemplates] = useState<PuckTemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPuckTemplatesApi(client, kind);
      setTemplates(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client, kind]);

  // baseURL / businessUnitKey are not read by `refresh` (the client is stable) but a change must refetch.
  useEffect(() => {
    void refresh();
  }, [refresh, baseURL, businessUnitKey]);

  const createTemplate = useCallback(
    async (input: CreatePuckTemplateInput): Promise<PuckTemplateResponse> => {
      const created = await createPuckTemplateApi(client, { value: input });
      await refresh();
      return created;
    },
    [client, refresh]
  );

  const deleteTemplate = useCallback(
    async (key: string): Promise<void> => {
      await deletePuckTemplateApi(client, key);
      await refresh();
    },
    [client, refresh]
  );

  return { templates, loading, error, refresh, createTemplate, deleteTemplate };
};
