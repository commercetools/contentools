import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { Puck, type Config, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import {
  PuckApiProvider,
  usePuckPage,
  usePuckTemplates,
} from '@commercetools-demo/puck-api';
import type { PuckData } from '@commercetools-demo/puck-types';
import type { PuckPageVersionEntry } from '@commercetools-demo/puck-types';
import {
  VersionHistoryProvider,
  VersionPreviewBanner,
  VersionAwareFieldsPanel,
  VersionHistoryButton,
  useVersionHistoryPanel,
  useVersionDiff,
} from '@commercetools-demo/puck-version-history';
import { createDefaultPuckConfig } from './config/defaultPuckConfig';
import { EditorToolbar } from './toolbar/EditorToolbar';
import { CreateTemplateDialog } from './toolbar/CreateTemplateDialog';
import { stripPuckDataToTemplate } from './utils/stripTemplateData';
import { useDirtyState } from './hooks/useDirtyState';
import {
  ComponentSearchProvider,
  ComponentsPanel,
  ComponentItemFilter,
} from './overrides/ComponentListSearch';
import { nimbusFieldTypes } from './overrides/NimbusFieldTypes';
import { Stack } from '@commercetools/nimbus';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';
import { EnsureIntlProvider } from './EnsureIntlProvider';

// ---------------------------------------------------------------------------
// Inner component (uses context from PuckApiProvider)
// ---------------------------------------------------------------------------

interface PuckEditorInnerProps {
  pageKey: string;
  config?: Config;
  onPublish?: (puckData: PuckData) => void;
  onSave?: (puckData: PuckData) => void;
  onError?: (error: Error) => void;
  /** Opens the preview view; when omitted the Preview button is hidden. */
  onPreview?: () => void;
  /** Notifies the host when the unsaved-changes state flips (for nav guards). */
  onDirtyChange?: (isDirty: boolean) => void;
  showPublishButton: boolean;
  autoSaveDebounceMs: number;
}

const PuckEditorInner: React.FC<PuckEditorInnerProps> = ({
  pageKey,
  config: configProp,
  onPublish,
  onSave,
  onError,
  onPreview,
  onDirtyChange,
  showPublishButton,
  autoSaveDebounceMs: _autoSaveDebounceMs,
}) => {
  const intl = useIntl();
  // Fall back to a locale-aware default config when the host doesn't supply one.
  const config = useMemo(
    () => configProp ?? createDefaultPuckConfig(intl),
    [configProp, intl]
  );
  const {
    page,
    states,
    versions,
    saving,
    loading,
    error,
    saveDraft,
    publish,
    revertToPublished,
    loadVersions,
  } = usePuckPage(pageKey);

  const { createTemplate } = usePuckTemplates('page');

  const latestDataRef = useRef<Data | null>(null);
  const [isApplyingVersion, setIsApplyingVersion] = useState(false);
  // Bumped on revert so the Puck canvas remounts and re-reads the restored data.
  const [reloadNonce, setReloadNonce] = useState(0);
  // "Create template from this page" dialog.
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Current live data (draft preferred, fallback to page value)
  const currentData: PuckData =
    states.draft?.puckData ??
    page?.puckData ?? {
      content: [],
      root: { props: {} },
    };

  // Version history panel state
  const versionHistory = useVersionHistoryPanel({
    versions: versions as PuckPageVersionEntry[],
    loadVersions,
    currentData,
  });

  // Unsaved-changes tracking — keyed so a new page / version / revert gets a
  // fresh baseline (and ignores Puck's normalising onChange on mount).
  const canvasKey = `${pageKey}:${versionHistory.selectedVersionId ?? 'current'}:${reloadNonce}`;
  const { isDirty: hasUnsavedChanges, markChange, markSaved } =
    useDirtyState(canvasKey);

  // Surface the dirty flag to the host (page-manager) for its nav guard.
  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  // Diff between selected historical version and current draft
  const diff = useVersionDiff(
    versionHistory.previewData,
    currentData
  );

  // Ref so handleChange can read the latest preview state without stale closure
  const isPreviewingRef = useRef(false);
  isPreviewingRef.current = versionHistory.isPreviewingHistory;

  // -------------------------------------------------------------------------
  // Normal editor handlers
  // -------------------------------------------------------------------------

  const handleChange = useCallback(
    (data: Data) => {
      if (isPreviewingRef.current) return;
      latestDataRef.current = data;
      markChange(data);
    },
    [markChange]
  );

  const handleSave = useCallback(async () => {
    const data = latestDataRef.current;
    if (!data) return;
    try {
      await saveDraft(data as PuckData);
      markSaved(data);
      onSave?.(data as PuckData);
    } catch (err) {
      onError?.(err as Error);
    }
  }, [saveDraft, onSave, onError, markSaved]);

  const handlePublish = useCallback(async () => {
    try {
      // Publish whatever is currently *saved* as the draft — never the
      // (possibly unsaved) live canvas. The service publishes the persisted
      // page value, so we must not write the canvas here; doing so was what
      // overwrote saved content with stale data on publish.
      await publish(false);
      onPublish?.(currentData);
    } catch (err) {
      onError?.(err as Error);
    }
  }, [publish, onPublish, currentData, onError]);

  const handleRevert = useCallback(async () => {
    try {
      await revertToPublished();
      // Force the canvas to remount so it shows the restored published data,
      // and reset the dirty baseline via the changed canvasKey.
      setReloadNonce((n) => n + 1);
    } catch (err) {
      onError?.(err as Error);
    }
  }, [revertToPublished, onError]);

  // -------------------------------------------------------------------------
  // Version history handlers
  // -------------------------------------------------------------------------

  const handleApplyVersion = useCallback(async () => {
    const versionData = versionHistory.previewData;
    if (!versionData) return;
    setIsApplyingVersion(true);
    try {
      await saveDraft(versionData);
      markSaved(versionData);
      onSave?.(versionData);
      versionHistory.clearSelection();
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setIsApplyingVersion(false);
    }
  }, [versionHistory, saveDraft, onSave, onError, markSaved]);

  // -------------------------------------------------------------------------
  // Create template from this page
  // -------------------------------------------------------------------------

  const handleCreateTemplate = useCallback(
    async (name: string, withoutData: boolean) => {
      // Prefer the live canvas (may hold unsaved edits); fall back to saved data.
      const source = (latestDataRef.current as PuckData | null) ?? currentData;
      const puckData = withoutData
        ? (stripPuckDataToTemplate(source as Data, config) as PuckData)
        : source;
      setTemplateSaving(true);
      try {
        await createTemplate({ name, kind: 'page', puckData });
        setTemplateDialogOpen(false);
      } catch (err) {
        onError?.(err as Error);
      } finally {
        setTemplateSaving(false);
      }
    },
    [createTemplate, currentData, config, onError]
  );

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '16px',
          color: 'var(--puck-color-grey-07)',
        }}
      >
        {intl.formatMessage({ id: 'Editor.loadingEditor' })}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '32px',
          color: 'var(--puck-color-red-07)',
          border: '1px solid var(--puck-color-red-04)',
          borderRadius: '8px',
          margin: '16px',
        }}
      >
        <strong>
          <FormattedMessage id="Editor.errorLoadingPage" />
        </strong>{' '}
        {error}
      </div>
    );
  }

  // Data shown in the Puck canvas — historical preview takes precedence
  const activeData: PuckData = versionHistory.previewData ?? currentData;

  return (
    <VersionHistoryProvider
      diff={diff}
      isPreviewingHistory={versionHistory.isPreviewingHistory}
      versions={versions as PuckPageVersionEntry[]}
      isLoadingVersions={versionHistory.isLoadingVersions}
      selectedVersionId={versionHistory.selectedVersionId}
      isApplying={isApplyingVersion}
      onVersionSelect={versionHistory.selectVersion}
      onApply={() => void handleApplyVersion()}
      onDiscard={versionHistory.clearSelection}
      onLoadVersions={versionHistory.openPanel}
    >
      <ComponentSearchProvider>
        <Puck
          key={`${versionHistory.selectedVersionId ?? 'current'}:${reloadNonce}`}
          config={config}
          data={activeData as Data}
          onChange={handleChange}
          onPublish={() => void handlePublish()}
          overrides={{
            fieldTypes: nimbusFieldTypes,
            header: () =>
              versionHistory.isPreviewingHistory ? (
                <Stack
                  gridArea="header"
                  direction="row"
                  gap="200"
                  alignItems="center"
                  justifyContent="flex-end"
                  padding="200"
                >
                  <VersionPreviewBanner
                    timestamp={versionHistory.selectedVersion!.timestamp}
                    onApply={() => void handleApplyVersion()}
                    onDiscard={versionHistory.clearSelection}
                    isApplying={isApplyingVersion}
                  />
                  <VersionHistoryButton disabled={isApplyingVersion} />
                </Stack>
              ) : (
                <EditorToolbar
                  title={page?.name ?? pageKey}
                  saving={saving}
                  isDirty={hasUnsavedChanges}
                  states={states}
                  onSave={() => void handleSave()}
                  onPublish={() => void handlePublish()}
                  onRevert={() => void handleRevert()}
                  onPreview={onPreview}
                  onCreateTemplate={() => setTemplateDialogOpen(true)}
                  showPublishButton={showPublishButton}
                />
              ),
            components: ({ children }) => <ComponentsPanel>{children}</ComponentsPanel>,
            componentItem: ({ children, name }) => (
              <ComponentItemFilter name={name}>{children}</ComponentItemFilter>
            ),
            fields: ({ children, isLoading }) => (
              <VersionAwareFieldsPanel isLoading={isLoading}>
                {children}
              </VersionAwareFieldsPanel>
            ),
          }}
        />
        <CreateTemplateDialog
          isOpen={templateDialogOpen}
          onOpenChange={(open) => setTemplateDialogOpen(open)}
          onConfirm={handleCreateTemplate}
          saving={templateSaving}
        />
      </ComponentSearchProvider>
    </VersionHistoryProvider>
  );
};

// ---------------------------------------------------------------------------
// Public component (self-contained, wraps PuckApiProvider)
// ---------------------------------------------------------------------------

export interface PuckEditorProps {
  /** Service base URL, e.g. "http://localhost:8080" */
  baseURL: string;
  /** CommerceTools project key */
  projectKey: string;
  /** Business unit key */
  businessUnitKey: string;
  /** JWT bearer token — required for save/publish mutations */
  jwtToken: string;
  /** Content locale (e.g. "en-US") used for locale-aware calls like product search */
  locale?: string;
  /** The key of the puck page to edit */
  pageKey: string;
  /**
   * Puck component config.
   * Defaults to `defaultPuckConfig` (all built-in components).
   * Consumers can extend or replace.
   */
  config?: Config;
  /** Called after a successful publish */
  onPublish?: (puckData: PuckData) => void;
  /** Called after each save */
  onSave?: (puckData: PuckData) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Opens the preview view; when omitted the toolbar Preview button is hidden. */
  onPreview?: () => void;
  /** Notifies the host when the unsaved-changes state flips (for nav guards). */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Show the Publish button in the toolbar. Default: true */
  showPublishButton?: boolean;
  /** Debounce delay for auto-save in ms. Default: 1500 */
  autoSaveDebounceMs?: number;
  /**
   * Optional per-key overrides for UI strings, applied on top of the resolved
   * locale catalog. Keys are message ids (e.g. "Editor.save").
   */
  messageOverrides?: Record<string, string>;
}

export const PuckEditor: React.FC<PuckEditorProps> = ({
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  pageKey,
  config,
  onPublish,
  onSave,
  onError,
  onPreview,
  onDirtyChange,
  showPublishButton = true,
  autoSaveDebounceMs = 1500,
  messageOverrides,
}) => {
  return (
    <PuckApiProvider
      baseURL={baseURL}
      projectKey={projectKey}
      businessUnitKey={businessUnitKey}
      jwtToken={jwtToken}
      locale={locale}
    >
      <EnsureNimbusProvider locale={locale}>
        <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
          <PuckEditorInner
            pageKey={pageKey}
            config={config}
            onPublish={onPublish}
            onSave={onSave}
            onError={onError}
            onPreview={onPreview}
            onDirtyChange={onDirtyChange}
            showPublishButton={showPublishButton}
            autoSaveDebounceMs={autoSaveDebounceMs}
          />
        </EnsureIntlProvider>
      </EnsureNimbusProvider>
    </PuckApiProvider>
  );
};
