import React, { createContext, useCallback, useContext, useState } from 'react';
import type { PuckDataDiff, VersionEntry } from '../types';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface VersionHistoryContextValue {
  // Used by VersionAwareFieldsPanel
  diff: PuckDataDiff | null;
  isPreviewingHistory: boolean;

  // Sidebar tab management (read by ComponentsPanel & VersionHistoryButton)
  activeTab: 'components' | 'history';
  openHistoryTab: () => void;
  closeHistoryTab: () => void;
  isHistoryTabActive: boolean;

  // Version list data (read by VersionHistorySidebarContent)
  versions: VersionEntry[];
  isLoadingVersions: boolean;
  selectedVersionId: string | null;
  isApplying: boolean;
  onVersionSelect: (id: string) => void;
  onApply: () => void;
  onDiscard: () => void;
}

const VersionHistoryContext = createContext<VersionHistoryContextValue>({
  diff: null,
  isPreviewingHistory: false,
  activeTab: 'components',
  openHistoryTab: () => {},
  closeHistoryTab: () => {},
  isHistoryTabActive: false,
  versions: [],
  isLoadingVersions: false,
  selectedVersionId: null,
  isApplying: false,
  onVersionSelect: () => {},
  onApply: () => {},
  onDiscard: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface VersionHistoryProviderProps {
  diff: PuckDataDiff | null;
  isPreviewingHistory: boolean;
  versions: VersionEntry[];
  isLoadingVersions: boolean;
  selectedVersionId: string | null;
  isApplying: boolean;
  onVersionSelect: (id: string) => void;
  onApply: () => void;
  onDiscard: () => void;
  /** Called when the History tab is first opened so versions can be fetched. */
  onLoadVersions: () => Promise<void>;
  children: React.ReactNode;
}

export const VersionHistoryProvider: React.FC<VersionHistoryProviderProps> = ({
  diff,
  isPreviewingHistory,
  versions,
  isLoadingVersions,
  selectedVersionId,
  isApplying,
  onVersionSelect,
  onApply,
  onDiscard,
  onLoadVersions,
  children,
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'history'>('components');

  const openHistoryTab = useCallback(() => {
    setActiveTab('history');
    void onLoadVersions();
  }, [onLoadVersions]);

  const closeHistoryTab = useCallback(() => {
    setActiveTab('components');
  }, []);

  return (
    <VersionHistoryContext.Provider
      value={{
        diff,
        isPreviewingHistory,
        activeTab,
        openHistoryTab,
        closeHistoryTab,
        isHistoryTabActive: activeTab === 'history',
        versions,
        isLoadingVersions,
        selectedVersionId,
        isApplying,
        onVersionSelect,
        onApply,
        onDiscard,
      }}
    >
      {children}
    </VersionHistoryContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useVersionHistoryContext = (): VersionHistoryContextValue =>
  useContext(VersionHistoryContext);
