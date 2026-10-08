import { useCallback, useEffect, useState } from 'react';
import type {
  PuckPageState,
  PuckStateInfo,
} from '@commercetools-demo/puck-types';
import {
  getPuckPageStatesApi,
  publishPuckPageApi,
  revertPuckPageDraftApi,
} from '../api/puck-states.api';
import { usePuckApiContext } from '../context/PuckApiContext';

export interface UsePuckStateManagementReturn {
  states: PuckStateInfo;
  loading: boolean;
  error: string | null;
  fetchStates: () => Promise<void>;
  publish: (clearDraft?: boolean) => Promise<void>;
  revertToPublished: () => Promise<void>;
}

/**
 * Lightweight hook for reading and managing draft/published states.
 * Useful in renderer or preview contexts where you only need state transitions.
 */
export const usePuckStateManagement = (
  pageKey: string
): UsePuckStateManagementReturn => {
  const { baseURL, projectKey, businessUnitKey, jwtToken } =
    usePuckApiContext();

  const [states, setStates] = useState<PuckStateInfo>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPuckPageStatesApi(
        baseURL,
        projectKey,
        businessUnitKey,
        pageKey
      );
      setStates(data.states);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, projectKey, businessUnitKey, pageKey]);

  useEffect(() => {
    void fetchStates();
  }, [fetchStates]);

  const publish = useCallback(
    async (clearDraft = false): Promise<void> => {
      if (!jwtToken) throw new Error('jwtToken is required to publish');
      const state: PuckPageState = await publishPuckPageApi(
        baseURL,
        projectKey,
        jwtToken,
        businessUnitKey,
        pageKey,
        clearDraft
      );
      setStates(state.states);
    },
    [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]
  );

  const revertToPublished = useCallback(async (): Promise<void> => {
    if (!jwtToken) throw new Error('jwtToken is required to revert');
    const state: PuckPageState = await revertPuckPageDraftApi(
      baseURL,
      projectKey,
      jwtToken,
      businessUnitKey,
      pageKey
    );
    setStates(state.states);
  }, [baseURL, projectKey, jwtToken, businessUnitKey, pageKey]);

  return { states, loading, error, fetchStates, publish, revertToPublished };
};
