import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PuckData,
  PuckPageState,
  PuckPageValue,
  PuckPageVersionEntry,
  PuckStateInfo,
  UpdatePuckPageInput,
} from '@commercetools-demo/puck-types';
import {
  getPuckPageApi,
  updatePuckPageApi,
} from '../api/puck-pages.api';
import {
  getPuckPageVersionsApi,
  publishPuckPageApi,
  revertPuckPageDraftApi,
} from '../api/puck-states.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckPageReturn {
  page: PuckPageValue | null;
  states: PuckStateInfo;
  versions: PuckPageVersionEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  reload: () => Promise<void>;
  saveDraft: (puckData: PuckData) => Promise<void>;
  updateMeta: (input: Omit<UpdatePuckPageInput, 'puckData'>) => Promise<void>;
  publish: (clearDraft?: boolean) => Promise<void>;
  revertToPublished: () => Promise<void>;
  loadVersions: () => Promise<void>;
}

export const usePuckPage = (pageKey: string): UsePuckPageReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [page, setPage] = useState<PuckPageValue | null>(null);
  const [states, setStates] = useState<PuckStateInfo>({});
  const [versions, setVersions] = useState<PuckPageVersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Debounce timer ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPuckPageApi(
        baseURL,
        projectKey,
        businessUnitKey,
        pageKey
      );
      setPage(data.value);
      setStates(data.states);
      setIsDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey, pageKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    async (puckData: PuckData): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to save');
      setIsDirty(true);

      // Cancel pending debounce
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      return new Promise((resolve, reject) => {
        saveTimerRef.current = setTimeout(async () => {
          setSaving(true);
          try {
            const updated = await updatePuckPageApi(
              baseURL,
              projectKey,
              jwtToken,
              businessUnitKey,
              pageKey,
              { value: { puckData } }
            );
            setPage(updated.value);
            // Keep the draft state in sync with the freshly-saved value so
            // derived `currentData` (states.draft ?? page) never goes stale.
            setStates((prev) => ({ ...prev, draft: updated.value }));
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
    [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]
  );

  const updateMeta = useCallback(
    async (input: Omit<UpdatePuckPageInput, 'puckData'>): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to update');
      setSaving(true);
      try {
        const updated = await updatePuckPageApi(
          baseURL,
          projectKey,
          jwtToken,
          businessUnitKey,
          pageKey,
          { value: input }
        );
        setPage(updated.value);
        setStates((prev) => ({ ...prev, draft: updated.value }));
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]
  );

  const publish = useCallback(
    async (clearDraft = false): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to publish');
      setSaving(true);
      try {
        const state: PuckPageState = await publishPuckPageApi(
          baseURL,
          projectKey,
          jwtToken,
          businessUnitKey,
          pageKey,
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
    [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]
  );

  const revertToPublished = useCallback(async (): Promise<void> => {
    if (!jwtToken) throw new Error('jwtToken is required to revert');
    setSaving(true);
    try {
      const state: PuckPageState = await revertPuckPageDraftApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        pageKey
      );
      setStates(state.states);
      if (state.states.published) setPage(state.states.published);
      setIsDirty(false);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]);

  const loadVersions = useCallback(async (): Promise<void> => {
    try {
      const versionData = await getPuckPageVersionsApi(
        baseURL,
        projectKey,
        businessUnitKey,
        pageKey
      );
      setVersions(versionData.versions);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [baseURL, projectKey, businessUnitKey, pageKey]);

  return {
    page,
    states,
    versions,
    loading,
    saving,
    error,
    isDirty,
    reload,
    saveDraft,
    updateMeta,
    publish,
    revertToPublished,
    loadVersions,
  };
};
