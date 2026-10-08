import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl, type IntlShape } from 'react-intl';
import { Puck, type Config, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import {
  PuckApiProvider,
  usePuckContent,
  usePuckTemplates,
} from '@commercetools-demo/puck-api';
import type { PuckContentVersionEntry, PuckData } from '@commercetools-demo/puck-types';
import { EnsureIntlProvider } from './EnsureIntlProvider';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';
import {
  ComponentSearchProvider,
  ComponentsPanel,
  ComponentItemFilter,
  CreateTemplateDialog,
  EditorToolbar,
  nimbusFieldTypes,
  stripPuckDataToTemplate,
  useDirtyState,
} from '@commercetools-demo/puck-editor';
import {
  VersionHistoryProvider,
  VersionPreviewBanner,
  VersionAwareFieldsPanel,
  VersionHistoryButton,
  useVersionHistoryPanel,
  useVersionDiff,
} from '@commercetools-demo/puck-version-history';
import { LoadingSpinner, Stack, Text } from '@commercetools/nimbus';

// ---------------------------------------------------------------------------
// Content-specific Puck config: inject localized title + slot root fields.
// The `defaultProps` (title/slot) are stored content data, not UI chrome, so
// they stay as literal values; only the field `label`s are localized.
// ---------------------------------------------------------------------------

function buildContentConfig(config: Config, intl: IntlShape): Config {
  const otherRootFields = Object.fromEntries(
    Object.entries(config.root?.fields ?? {}).filter(([k]) => k !== 'title')
  );
  return {
    ...config,
    root: {
      ...config.root,
      fields: {
        title: { type: 'text', label: intl.formatMessage({ id: 'ContentManager.contentTitleFieldLabel' }) },
        slot: { type: 'text', label: intl.formatMessage({ id: 'ContentManager.slotFieldLabel' }) },
        ...otherRootFields,
      },
      defaultProps: {
        title: 'New Content',
        slot: '',
        ...config.root?.defaultProps,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Inner editor component (uses context)
// ---------------------------------------------------------------------------

interface ContentEditorInnerProps {
  contentKey: string;
  config: Config;
  onPublish?: (data: PuckData) => void;
  onSave?: (data: PuckData) => void;
  onError?: (error: Error) => void;
}

const ContentEditorInner: React.FC<ContentEditorInnerProps> = ({
  contentKey,
  config,
  onPublish,
  onSave,
  onError,
}) => {
  const intl = useIntl();
  const {
    content,
    states,
    versions,
    saving,
    loading,
    error,
    saveDraft,
    publish,
    revertToPublished,
    loadVersions,
  } = usePuckContent(contentKey);

  const { createTemplate } = usePuckTemplates('content');

  const latestDataRef = useRef<Data | null>(null);
  const [isApplyingVersion, setIsApplyingVersion] = useState(false);
  // Bumped on revert so the Puck canvas remounts and re-reads the restored data.
  const [reloadNonce, setReloadNonce] = useState(0);
  // "Create template from this content" dialog.
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Current live data (draft preferred, fallback to content value)
  const currentData: PuckData =
    states.draft?.data ??
    content?.data ?? {
      content: [],
      root: { props: {} },
    };

  // Version history panel state
  const versionHistory = useVersionHistoryPanel({
    versions: versions as PuckContentVersionEntry[],
    loadVersions,
    currentData,
  });

  // Diff between selected historical version and current draft
  const diff = useVersionDiff(
    versionHistory.previewData,
    currentData
  );

  // Ref so handleChange can read the latest preview state without stale closure
  const isPreviewingRef = useRef(false);
  isPreviewingRef.current = versionHistory.isPreviewingHistory;

  // Unsaved-changes tracking — keyed so a new content item / version / revert
  // gets a fresh baseline (and ignores Puck's normalising onChange on mount).
  const canvasKey = `${contentKey}:${versionHistory.selectedVersionId ?? 'current'}:${reloadNonce}`;
  const { isDirty: hasUnsavedChanges, markChange, markSaved } =
    useDirtyState(canvasKey);

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

  const handlePublish = useCallback(
    async (data: Data) => {
      try {
        await saveDraft(data as PuckData);
        markSaved(data);
        await publish(false);
        onPublish?.(data as PuckData);
      } catch (err) {
        onError?.(err as Error);
      }
    },
    [saveDraft, publish, onPublish, onError, markSaved]
  );

  const handleRevert = useCallback(async () => {
    try {
      await revertToPublished();
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
  // Content-specific Puck config: inject title + slot root fields
  // -------------------------------------------------------------------------

  const contentConfig = useMemo(
    (): Config => buildContentConfig(config, intl),
    [config, intl]
  );

  const handleCreateTemplate = useCallback(
    async (name: string, withoutData: boolean) => {
      const source =
        (latestDataRef.current as PuckData | null) ?? currentData;
      const puckData = withoutData
        ? (stripPuckDataToTemplate(source as Data, contentConfig) as PuckData)
        : source;
      setTemplateSaving(true);
      try {
        await createTemplate({ name, kind: 'content', puckData });
        setTemplateDialogOpen(false);
      } catch (err) {
        onError?.(err as Error);
      } finally {
        setTemplateSaving(false);
      }
    },
    [createTemplate, currentData, contentConfig, onError]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Stack direction="column" gap="400" alignItems="center">
          <LoadingSpinner />
          <Text color="neutral.11">{intl.formatMessage({ id: 'ContentManager.loadingEditor' })}</Text>
        </Stack>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <Text color="critical.11">
          {intl.formatMessage({ id: 'ContentManager.errorLoadingContent' }, {
            message: error,
            b: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      </div>
    );
  }

  // Data shown in Puck canvas — historical preview takes precedence
  const activeData: PuckData = versionHistory.previewData ?? currentData;

  // Cast states for EditorToolbar (PuckContentStateInfo is compatible with PuckStateInfo)
  const toolbarStates = states as unknown as Parameters<typeof EditorToolbar>[0]['states'];

  return (
    <VersionHistoryProvider
      diff={diff}
      isPreviewingHistory={versionHistory.isPreviewingHistory}
      versions={versions as PuckContentVersionEntry[]}
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
          config={contentConfig}
          data={activeData as Data}
          onChange={handleChange}
          onPublish={handlePublish}
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
                  title={content?.name ?? intl.formatMessage({ id: 'ContentManager.defaultContentName' })}
                  saving={saving}
                  isDirty={hasUnsavedChanges}
                  states={toolbarStates}
                  onSave={() => void handleSave()}
                  onPublish={() => void handlePublish(activeData as Data)}
                  onRevert={() => void handleRevert()}
                  onCreateTemplate={() => setTemplateDialogOpen(true)}
                  createTemplateLabel={intl.formatMessage({ id: 'ContentManager.createTemplateLabel' })}
                  showPublishButton
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
// Public component — wraps its own PuckApiProvider
// ---------------------------------------------------------------------------

export interface ContentEditorProps {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  /** Content locale (e.g. "en-US") used for locale-aware calls like product search */
  locale?: string;
  contentKey: string;
  /** Puck component config — must match what's used in the renderer */
  config: Config;
  onPublish?: (data: PuckData) => void;
  onSave?: (data: PuckData) => void;
  onError?: (error: Error) => void;
  /**
   * Optional per-key overrides for UI strings, applied on top of the resolved
   * locale catalog. Keys are message ids (e.g. "ContentManager.loadingEditor").
   */
  messageOverrides?: Record<string, string>;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  contentKey,
  config,
  onPublish,
  onSave,
  onError,
  messageOverrides,
}) => (
  <EnsureNimbusProvider locale={locale}>
    <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
      <PuckApiProvider
        baseURL={baseURL}
        projectKey={projectKey}
        businessUnitKey={businessUnitKey}
        jwtToken={jwtToken}
        locale={locale}
      >
        <ContentEditorInner
          contentKey={contentKey}
          config={config}
          onPublish={onPublish}
          onSave={onSave}
          onError={onError}
        />
      </PuckApiProvider>
    </EnsureIntlProvider>
  </EnsureNimbusProvider>
);
