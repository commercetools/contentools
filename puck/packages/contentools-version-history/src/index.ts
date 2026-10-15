// Types
export type { ComponentDiff, PuckDataDiff, VersionEntry } from './types';

// Context
export {
  VersionHistoryProvider,
  useVersionHistoryContext,
} from './context/VersionHistoryContext';

// Hooks
export { useVersionDiff } from './hooks/useVersionDiff';
export { useVersionHistoryPanel } from './hooks/useVersionHistoryPanel';
export type { UseVersionHistoryPanelReturn } from './hooks/useVersionHistoryPanel';

// Components
export { VersionHistoryButton } from './components/VersionHistoryButton';
export { VersionHistorySidebarContent } from './components/VersionHistorySidebarContent';
export { VersionCard } from './components/VersionCard';
export { DiffSummary } from './components/DiffSummary';
export { VersionPreviewBanner } from './components/VersionPreviewBanner';

// Puck overrides
export { VersionAwareFieldsPanel } from './overrides/VersionAwareField';

// Locale catalogs owned by this package (merged by the host app's intl provider)
export { catalogs as intlCatalogs } from './intl';
