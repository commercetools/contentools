import { useCallback, useState } from 'react';
import type { PuckData } from '@commercetools-demo/puck-types';
import type { VersionEntry } from '../types';

interface UseVersionHistoryPanelOptions {
  versions: VersionEntry[];
  loadVersions: () => Promise<void>;
  /** The current live data shown in the editor (draft or published fallback). */
  currentData: PuckData;
}

export interface UseVersionHistoryPanelReturn {
  isPanelOpen: boolean;
  isPreviewingHistory: boolean;
  isLoadingVersions: boolean;
  selectedVersionId: string | null;
  selectedVersion: VersionEntry | null;
  /** When non-null, the editor should display this data instead of `currentData`. */
  previewData: PuckData | null;
  openPanel: () => Promise<void>;
  closePanel: () => void;
  selectVersion: (id: string) => void;
  /** Clears the selected version but keeps the panel open. */
  clearSelection: () => void;
  /**
   * Returns the PuckData of the selected version so the caller can call
   * `saveDraft` with it. Closes the panel.
   */
  applyVersion: () => PuckData | null;
}

/** Extracts PuckData from a version entry regardless of which field holds it. */
function extractPuckData(entry: VersionEntry): PuckData | null {
  return entry.puckData ?? entry.data ?? null;
}

export function useVersionHistoryPanel({
  versions,
  loadVersions,
  currentData,
}: UseVersionHistoryPanelOptions): UseVersionHistoryPanelReturn {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const selectedVersion = selectedVersionId
    ? (versions.find((v) => v.id === selectedVersionId) ?? null)
    : null;

  const previewData = selectedVersion ? extractPuckData(selectedVersion) : null;

  const isPreviewingHistory = previewData !== null;

  const openPanel = useCallback(async () => {
    setIsPanelOpen(true);
    setIsLoadingVersions(true);
    try {
      await loadVersions();
    } finally {
      setIsLoadingVersions(false);
    }
  }, [loadVersions]);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedVersionId(null);
  }, []);

  const selectVersion = useCallback((id: string) => {
    setSelectedVersionId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVersionId(null);
  }, []);

  const applyVersion = useCallback((): PuckData | null => {
    if (!selectedVersion) return null;
    const data = extractPuckData(selectedVersion);
    setIsPanelOpen(false);
    setSelectedVersionId(null);
    return data;
  }, [selectedVersion]);

  // Suppress unused warning — currentData is part of the public API signature
  void currentData;

  return {
    isPanelOpen,
    isPreviewingHistory,
    isLoadingVersions,
    selectedVersionId,
    selectedVersion,
    previewData,
    openPanel,
    closePanel,
    selectVersion,
    clearSelection,
    applyVersion,
  };
}
