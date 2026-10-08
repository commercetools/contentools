import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PuckContentMeta,
  PuckContentState,
  PuckContentStateInfo,
  PuckContentValue,
  PuckContentVersionEntry,
  PuckData,
} from '@commercetools-demo/puck-types';
import {
  getPuckContentApi,
  updatePuckContentApi,
} from '../api/puck-contents.api';
import {
  getPuckContentVersionsApi,
  publishPuckContentApi,
  revertPuckContentDraftApi,
} from '../api/puck-content-states.api';
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
  saveDraft: (
    data: PuckData,
    meta?: PuckContentMeta
  ) => Promise<void>;
  publish: (clearDraft?: boolean) => Promise<void>;
  revertToPublished: () => Promise<void>;
  loadVersions: () => Promise<void>;
}

export const usePuckContent = (contentKey: string): UsePuckContentReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
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
      const data = await getPuckContentApi(
        baseURL,
        projectKey,
        businessUnitKey,
        contentKey
      );
      setContent(data.value);
      setStates(data.states);
      setIsDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey, contentKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    async (
      data: PuckData,
      meta?: PuckContentMeta
    ): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to save');
      setIsDirty(true);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      return new Promise((resolve, reject) => {
        saveTimerRef.current = setTimeout(async () => {
          setSaving(true);
          try {
            const updated = await updatePuckContentApi(
              baseURL,
              projectKey,
              jwtToken,
              businessUnitKey,
              contentKey,
              { value: { data, ...(meta !== undefined ? { meta } : {}) } }
            );
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
    [baseURL, projectKey, jwtToken, businessUnitKey, contentKey]
  );

  const publish = useCallback(
    async (clearDraft = false): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to publish');
      setSaving(true);
      try {
        const state: PuckContentState = await publishPuckContentApi(
          baseURL,
          projectKey,
          jwtToken,
          businessUnitKey,
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
    [baseURL, projectKey, jwtToken, businessUnitKey, contentKey]
  );

  const revertToPublished = useCallback(async (): Promise<void> => {
    if (!jwtToken) throw new Error('jwtToken is required to revert');
    setSaving(true);
    try {
      const state: PuckContentState = await revertPuckContentDraftApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
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
  }, [baseURL, projectKey, jwtToken, businessUnitKey, contentKey]);

  const loadVersions = useCallback(async (): Promise<void> => {
    try {
      const versionData = await getPuckContentVersionsApi(
        baseURL,
        projectKey,
        businessUnitKey,
        contentKey
      );
      setVersions(versionData.versions);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [baseURL, projectKey, businessUnitKey, contentKey]);

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
