/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PuckContentMeta,
  PuckContentState,
  PuckContentStateInfo,
  PuckContentValue,
  PuckContentVersionEntry,
  PuckData,
} from '@commercetools-labs/contentools-types';
import {
  getPuckContentApi,
  updatePuckContentApi,
} from '../api/puck-contents.api';
import {
  getPuckContentVersionsApi,
  publishPuckContentApi,
  revertPuckContentDraftApi,
} from '../api/puck-content-states.api';
import { authRequiredError } from '../client/errors';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckContentReturn {
  content: PuckContentValue | null;
  states: PuckContentStateInfo;
  versions: PuckContentVersionEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  reload: () => Promise<void>;
  saveDraft: (data: PuckData, meta?: PuckContentMeta) => Promise<void>;
  publish: (clearDraft?: boolean) => Promise<void>;
  revertToPublished: () => Promise<void>;
  loadVersions: () => Promise<void>;
}

export const usePuckContent = (contentKey: string): UsePuckContentReturn => {
  const { client, baseURL, businessUnitKey, canAuthenticate } =
    usePuckApiContext();

  const [content, setContent] = useState<PuckContentValue | null>(null);
  const [states, setStates] = useState<PuckContentStateInfo>({});
  const [versions, setVersions] = useState<PuckContentVersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPuckContentApi(client, contentKey);
      setContent(data.value);
      setStates(data.states);
      setIsDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client, contentKey]);

  // baseURL / businessUnitKey are not read by `reload` (the client is stable) but a change must refetch.
  useEffect(() => {
    void reload();
  }, [reload, baseURL, businessUnitKey]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    async (data: PuckData, meta?: PuckContentMeta): Promise<void> => {
      if (!canAuthenticate)
        throw authRequiredError(
          `${client.baseURL}/${client.businessUnitKey}/puck-contents/${contentKey}`,
          'PUT'
        );
      setIsDirty(true);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      return new Promise((resolve, reject) => {
        saveTimerRef.current = setTimeout(async () => {
          setSaving(true);
          try {
            const updated = await updatePuckContentApi(client, contentKey, {
              value: { data, ...(meta !== undefined ? { meta } : {}) },
            });
            setContent(updated.value);
            setIsDirty(false);
            resolve();
          } catch (err) {
            setError((err as Error).message);
            reject(err);
          } finally {
            setSaving(false);
          }
        }, 1500);
      });
    },
    [client, canAuthenticate, contentKey]
  );

  const publish = useCallback(
    async (clearDraft = false): Promise<void> => {
      setSaving(true);
      try {
        const state: PuckContentState = await publishPuckContentApi(
          client,
          contentKey,
          clearDraft
        );
        setStates(state.states);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, contentKey]
  );

  const revertToPublished = useCallback(async (): Promise<void> => {
    setSaving(true);
    try {
      const state: PuckContentState = await revertPuckContentDraftApi(
        client,
        contentKey
      );
      setStates(state.states);
      if (state.states.published) setContent(state.states.published);
      setIsDirty(false);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [client, contentKey]);

  const loadVersions = useCallback(async (): Promise<void> => {
    try {
      const versionData = await getPuckContentVersionsApi(client, contentKey);
      setVersions(versionData.versions);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [client, contentKey]);

  return {
    content,
    states,
    versions,
    loading,
    saving,
    error,
    isDirty,
    reload,
    saveDraft,
    publish,
    revertToPublished,
    loadVersions,
  };
};
