import { useCallback, useEffect, useState } from 'react';
import type {
  PuckPageState,
  PuckStateInfo,
} from '@commercetools-labs/contentools-types';
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
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [states, setStates] = useState<PuckStateInfo>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPuckPageStatesApi(client, pageKey);
      setStates(data.states);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client, pageKey]);

  // baseURL / businessUnitKey are not read by `fetchStates` (the client is stable) but a change must refetch.
  useEffect(() => {
    void fetchStates();
  }, [fetchStates, baseURL, businessUnitKey]);

  const publish = useCallback(
    async (clearDraft = false): Promise<void> => {
      const state: PuckPageState = await publishPuckPageApi(
        client,
        pageKey,
        clearDraft
      );
      setStates(state.states);
    },
    [client, pageKey]
  );

  const revertToPublished = useCallback(async (): Promise<void> => {
    const state: PuckPageState = await revertPuckPageDraftApi(client, pageKey);
    setStates(state.states);
  }, [client, pageKey]);

  return { states, loading, error, fetchStates, publish, revertToPublished };
};
