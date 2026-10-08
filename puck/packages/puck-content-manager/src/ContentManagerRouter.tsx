import React, { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  BrowserRouter,
  Switch,
  Route,
  useHistory,
  useParams,
  useLocation,
} from 'react-router-dom';
import { useIntl, FormattedMessage, type MessageDescriptor } from 'react-intl';
import type { IntlShape } from 'react-intl';
import { Puck, type Config, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import {
  ComponentSearchProvider,
  ComponentsPanel,
  ComponentItemFilter,
  ComponentsResizer,
  CreateTemplateDialog,
  createDefaultPuckConfig,
  EditorToolbar,
  nimbusFieldTypes,
  PropertiesResizer,
  stripPuckDataToTemplate,
  UnsavedChangesDialog,
  useDirtyState,
} from '@commercetools-demo/puck-editor';
import { PuckRenderer } from '@commercetools-demo/puck-renderer';
import {
  VersionHistoryProvider,
  VersionHistoryButton,
  VersionPreviewBanner,
  VersionAwareFieldsPanel,
  useVersionHistoryPanel,
  useVersionDiff,
} from '@commercetools-demo/puck-version-history';
import { EnsureIntlProvider } from './EnsureIntlProvider';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';
import {
  PuckApiProvider,
  usePuckContents,
  usePuckContent,
  usePuckTemplates,
} from '@commercetools-demo/puck-api';
import type {
  CreatePuckContentInput,
  PuckContentListItem,
  PuckContentVersionEntry,
  PuckData,
} from '@commercetools-demo/puck-types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  FormField,
  Icon,
  IconButton,
  LoadingSpinner,
  Select,
  Stack,
  Text,
  TextInput,
  type DataTableColumnItem,
} from '@commercetools/nimbus';
import {
  Add,
  ChevronLeft,
  Close,
  Delete,
  Edit,
  Visibility,
} from '@commercetools/nimbus-icons';

// ---------------------------------------------------------------------------
// Nav bar style
// ---------------------------------------------------------------------------

const NAV_BAR_STYLE: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 16px',
  background: 'var(--color-surface, #fff)',
  borderBottom: '1px solid var(--color-neutral-90, #e0e0e0)',
  zIndex: 200,
  flexShrink: 0,
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<
  'draft' | 'published' | 'none',
  { colorPalette: 'warning' | 'positive' | 'neutral'; message: MessageDescriptor }
> = {
  draft: { colorPalette: 'warning', message: { id: 'ContentManager.statusDraft' } },
  published: { colorPalette: 'positive', message: { id: 'ContentManager.statusPublished' } },
  none: { colorPalette: 'neutral', message: { id: 'ContentManager.statusNone' } },
};

const StatusBadge: React.FC<{ variant: 'draft' | 'published' | 'none' }> = ({ variant }) => {
  const intl = useIntl();
  const meta = STATUS_BADGE[variant];
  return (
    <Badge colorPalette={meta.colorPalette} size="xs">
      {intl.formatMessage(meta.message)}
    </Badge>
  );
};

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
// Table row type
// ---------------------------------------------------------------------------

type ContentRow = PuckContentListItem & { id: string; [key: string]: unknown };

// ---------------------------------------------------------------------------
// ContentListRoute
// ---------------------------------------------------------------------------

interface ContentListRouteProps {
  defaultContentType?: string;
  backButton?: ReactNode;
}

const ContentListRoute: React.FC<ContentListRouteProps> = ({ defaultContentType, backButton }) => {
  const intl = useIntl();
  const history = useHistory();
  const { contents, loading, error, createContent, deleteContent } =
    usePuckContents(defaultContentType);
  const { templates } = usePuckTemplates('content');

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState(defaultContentType ?? '');
  // Selected template for the new content item ('' = Empty).
  const [templateKey, setTemplateKey] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  // Content item targeted by the (Nimbus) delete-confirmation dialog.
  const [pendingDelete, setPendingDelete] = useState<PuckContentListItem | null>(null);

  const handleCreate = async () => {
    setCreateError(null);
    if (!createName.trim()) { setCreateError(intl.formatMessage({ id: 'ContentManager.validationNameRequired' })); return; }
    if (!createType.trim()) { setCreateError(intl.formatMessage({ id: 'ContentManager.validationContentTypeRequired' })); return; }
    setCreating(true);
    try {
      const template = templateKey
        ? templates.find((t) => t.key === templateKey)
        : undefined;
      const input: CreatePuckContentInput = {
        name: createName.trim(),
        contentType: createType.trim(),
        data: template?.value.puckData ?? { content: [], root: { props: {} } },
      };
      const created = await createContent(input);
      setShowCreate(false);
      setCreateName('');
      setCreateType(defaultContentType ?? '');
      setTemplateKey('');
      history.push(`/${created.key}`, { contentName: created.value.name });
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (item: PuckContentListItem) => {
    setDeleting(item.key);
    try {
      await deleteContent(item.key);
      setPendingDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredContents = term
    ? contents.filter(
        (c) =>
          c.value.name.toLowerCase().includes(term) ||
          c.value.contentType.toLowerCase().includes(term)
      )
    : contents;

  const rows: ContentRow[] = filteredContents.map((c) => ({ ...c, id: c.key }));

  const columns: DataTableColumnItem<ContentRow>[] = [
    {
      id: 'name',
      header: intl.formatMessage({ id: 'ContentManager.columnName' }),
      accessor: (row) => row.value.name,
      render: ({ row }) => <Text fontWeight="bold">{row.value.name}</Text>,
    },
    {
      id: 'contentType',
      header: intl.formatMessage({ id: 'ContentManager.columnContentType' }),
      accessor: (row) => row.value.contentType,
      render: ({ row }) => (
        <code
          style={{
            background: '#f4f4f4',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          {row.value.contentType}
        </code>
      ),
    },
    {
      id: 'status',
      header: intl.formatMessage({ id: 'ContentManager.columnStatus' }),
      accessor: () => '',
      isSortable: false,
      render: ({ row }) => {
        const hasDraft = !!row.states.draft;
        const hasPublished = !!row.states.published;
        return (
          <Stack direction="row" gap="100" wrap="wrap">
            {hasDraft && <StatusBadge variant="draft" />}
            {hasPublished && <StatusBadge variant="published" />}
            {!hasDraft && !hasPublished && <StatusBadge variant="none" />}
          </Stack>
        );
      },
    },
    {
      id: 'updatedAt',
      header: intl.formatMessage({ id: 'ContentManager.columnUpdated' }),
      accessor: (row) => row.value.updatedAt,
      render: ({ row }) => (
        <Text color="neutral.11">
          {new Date(row.value.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      id: 'actions',
      header: intl.formatMessage({ id: 'ContentManager.columnActions' }),
      accessor: () => '',
      isSortable: false,
      render: ({ row }) => (
        <Stack direction="row" gap="100" alignItems="center">
          <IconButton
            aria-label={intl.formatMessage({ id: 'ContentManager.editAria' }, { name: row.value.name })}
            variant="ghost"
            size="xs"
            onPress={() => history.push(`/${row.key}`, { contentName: row.value.name })}
          >
            <Edit />
          </IconButton>
          <IconButton
            aria-label={intl.formatMessage({ id: 'ContentManager.previewAria' }, { name: row.value.name })}
            variant="ghost"
            size="xs"
            onPress={() =>
              history.push(`/${row.key}/preview`, { contentName: row.value.name })
            }
          >
            <Visibility />
          </IconButton>
          <IconButton
            aria-label={intl.formatMessage({ id: 'ContentManager.deleteAria' }, { name: row.value.name })}
            variant="ghost"
            colorPalette="critical"
            size="xs"
            isDisabled={deleting === row.key}
            onPress={() => setPendingDelete(row)}
          >
            <Delete />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <Stack direction="column" gap="600">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" gap="400" alignItems="center">
            {backButton}
            <Text as="h1" fontSize="2xl" fontWeight="700">
              <FormattedMessage id="ContentManager.contentItemsTitle" />
            </Text>
          </Stack>
          <Button variant="solid" onPress={() => setShowCreate((v) => !v)}>
            <Icon as={Add} /> <FormattedMessage id="ContentManager.newContent" />
          </Button>
        </Stack>

        {showCreate && (
          <Card.Root variant="outlined">
            <Card.Body>
              <Stack direction="column" gap="400">
                <Text as="h4" fontSize="xl" fontWeight="700">
                  <FormattedMessage id="ContentManager.createContentItem" />
                </Text>
                {createError && <Text color="critical.11">{createError}</Text>}
                <Stack direction="row" gap="400">
                  <div style={{ flex: 1 }}>
                    <FormField.Root>
                      <FormField.Label>
                        <FormattedMessage id="ContentManager.nameLabel" />
                      </FormField.Label>
                      <FormField.Input>
                        <TextInput
                          value={createName}
                          onChange={(v) => setCreateName(v)}
                          placeholder={intl.formatMessage({ id: 'ContentManager.namePlaceholder' })}
                        />
                      </FormField.Input>
                    </FormField.Root>
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormField.Root>
                      <FormField.Label>
                        <FormattedMessage id="ContentManager.contentTypeLabel" />
                      </FormField.Label>
                      <FormField.Input>
                        <TextInput
                          value={createType}
                          onChange={(v) => setCreateType(v)}
                          placeholder={intl.formatMessage({ id: 'ContentManager.contentTypePlaceholder' })}
                        />
                      </FormField.Input>
                    </FormField.Root>
                  </div>
                </Stack>
                <FormField.Root>
                  <FormField.Label>
                    <FormattedMessage id="ContentManager.templateLabel" />
                  </FormField.Label>
                  <FormField.Input>
                    <Select.Root
                      aria-label={intl.formatMessage({ id: 'ContentManager.templateLabel' })}
                      selectedKey={templateKey || 'empty'}
                      onSelectionChange={(key) =>
                        setTemplateKey(key == null || key === 'empty' ? '' : String(key))
                      }
                    >
                      <Select.Options>
                        <Select.Option id="empty">
                          {intl.formatMessage({ id: 'ContentManager.templateEmpty' })}
                        </Select.Option>
                        {templates.map((t) => (
                          <Select.Option key={t.key} id={t.key}>
                            {t.value.name}
                          </Select.Option>
                        ))}
                      </Select.Options>
                    </Select.Root>
                  </FormField.Input>
                </FormField.Root>
                <Stack direction="row" gap="200">
                  <Button variant="solid" onPress={() => void handleCreate()} isDisabled={creating}>
                    {creating
                      ? intl.formatMessage({ id: 'ContentManager.creating' })
                      : intl.formatMessage({ id: 'ContentManager.create' })}
                  </Button>
                  <Button variant="outline" onPress={() => setShowCreate(false)}>
                    <FormattedMessage id="ContentManager.cancel" />
                  </Button>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}

        <div style={{ maxWidth: 360 }}>
          <TextInput
            aria-label={intl.formatMessage({ id: 'ContentManager.searchAria' })}
            placeholder={intl.formatMessage({ id: 'ContentManager.searchPlaceholder' })}
            value={search}
            onChange={(v) => setSearch(v)}
            width="100%"
            trailingElement={
              search !== '' ? (
                <IconButton
                  aria-label={intl.formatMessage({ id: 'ContentManager.clearSearch' })}
                  variant="ghost"
                  colorPalette="neutral"
                  size="2xs"
                  onPress={() => setSearch('')}
                >
                  <Close />
                </IconButton>
              ) : undefined
            }
          />
        </div>

        {error && <Text color="critical.11">{error}</Text>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <LoadingSpinner />
          </div>
        ) : contents.length === 0 ? (
          <Stack direction="column" gap="400" alignItems="center">
            <Text color="neutral.11">
              <FormattedMessage id="ContentManager.noContent" />
            </Text>
          </Stack>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            aria-label={intl.formatMessage({ id: 'ContentManager.contentItemsTableAria' })}
          />
        )}
      </Stack>

      {/* Delete confirmation (Nimbus) */}
      <Dialog.Root
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <FormattedMessage id="ContentManager.deleteContentTitle" />
            </Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Text>
              <FormattedMessage
                id="ContentManager.deleteConfirm"
                values={{
                  name: pendingDelete?.value.name,
                  b: (chunks) => (
                    <Text as="span" fontWeight="700">
                      {chunks}
                    </Text>
                  ),
                }}
              />
            </Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button slot="close" variant="outline" isDisabled={deleting !== null}>
              <FormattedMessage id="ContentManager.cancel" />
            </Button>
            <Button
              colorPalette="critical"
              isDisabled={deleting !== null}
              onPress={() => {
                if (pendingDelete) void handleDelete(pendingDelete);
              }}
            >
              {deleting !== null
                ? intl.formatMessage({ id: 'ContentManager.deleting' })
                : intl.formatMessage({ id: 'ContentManager.delete' })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ContentEditorRoute
// ---------------------------------------------------------------------------

interface ContentEditorRouteProps {
  config: Config;
  backButton?: ReactNode;
}

const ContentEditorRoute: React.FC<ContentEditorRouteProps> = ({ config, backButton }) => {
  const intl = useIntl();
  const { contentKey } = useParams<{ contentKey: string }>();
  const history = useHistory();
  const location = useLocation();
  const contentName =
    (location.state as { contentName?: string } | null)?.contentName ??
    contentKey ??
    intl.formatMessage({ id: 'ContentManager.defaultContentName' });

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
  } = usePuckContent(contentKey!);

  const { createTemplate } = usePuckTemplates('content');

  const latestDataRef = useRef<Data | null>(null);
  const [isApplyingVersion, setIsApplyingVersion] = useState(false);
  // Bumped on revert so the Puck canvas remounts and re-reads the restored data.
  const [reloadNonce, setReloadNonce] = useState(0);
  // Deferred navigation while the unsaved-changes dialog is open.
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  // "Create template from this content" dialog.
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  const currentData: PuckData =
    states.draft?.data ??
    content?.data ?? { content: [], root: { props: {} } };

  const versionHistory = useVersionHistoryPanel({
    versions: versions as PuckContentVersionEntry[],
    loadVersions,
    currentData,
  });

  const diff = useVersionDiff(versionHistory.previewData, currentData);

  const isPreviewingRef = useRef(false);
  isPreviewingRef.current = versionHistory.isPreviewingHistory;

  // Unsaved-changes tracking — keyed so a new content item / version / revert
  // gets a fresh baseline (and ignores Puck's normalising onChange on mount).
  const canvasKey = `${contentKey}:${versionHistory.selectedVersionId ?? 'current'}:${reloadNonce}`;
  const { isDirty: hasUnsavedChanges, markChange, markSaved } =
    useDirtyState(canvasKey);

  const guardedNavigate = useCallback(
    (navFn: () => void) => {
      if (hasUnsavedChanges) {
        setPendingNav(() => navFn);
      } else {
        navFn();
      }
    },
    [hasUnsavedChanges]
  );

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
    } catch (err) {
      console.error('[ContentManagerRouter] save error:', err);
    }
  }, [saveDraft, markSaved]);

  const handlePublish = useCallback(
    async (data: Data) => {
      try {
        await saveDraft(data as PuckData);
        markSaved(data);
        await publish(false);
      } catch (err) {
        console.error('[ContentManagerRouter] publish error:', err);
      }
    },
    [saveDraft, publish, markSaved]
  );

  const handleRevert = useCallback(async () => {
    try {
      await revertToPublished();
      setReloadNonce((n) => n + 1);
    } catch (err) {
      console.error('[ContentManagerRouter] revert error:', err);
    }
  }, [revertToPublished]);

  const handleApplyVersion = useCallback(async () => {
    const versionData = versionHistory.previewData;
    if (!versionData) return;
    setIsApplyingVersion(true);
    try {
      await saveDraft(versionData);
      markSaved(versionData);
      versionHistory.clearSelection();
    } catch (err) {
      console.error('[ContentManagerRouter] apply version error:', err);
    } finally {
      setIsApplyingVersion(false);
    }
  }, [versionHistory, saveDraft, markSaved]);

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
        console.error('[ContentManagerRouter] create template error:', err);
      } finally {
        setTemplateSaving(false);
      }
    },
    [createTemplate, currentData, contentConfig]
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

  const activeData: PuckData = versionHistory.previewData ?? currentData;
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={NAV_BAR_STYLE}>
          {backButton}
          {backButton && <Text color="neutral.11">/</Text>}
          <Button
            variant="ghost"
            onPress={() => guardedNavigate(() => history.push('/'))}
          >
            <Icon as={ChevronLeft} /> <FormattedMessage id="ContentManager.contentItemsTitle" />
          </Button>
          <Text color="neutral.11">/</Text>
          <Text fontWeight="bold">{contentName}</Text>
        </div>
        <div className="puck-editor-fill" style={{ flex: 1, overflow: 'hidden' }}>
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
                      title={content?.name ?? contentName}
                      saving={saving}
                      isDirty={hasUnsavedChanges}
                      states={toolbarStates}
                      onSave={() => void handleSave()}
                      onPublish={() => void handlePublish(activeData as Data)}
                      onRevert={() => void handleRevert()}
                      onPreview={() =>
                        guardedNavigate(() =>
                          history.push(`/${contentKey}/preview`, { contentName })
                        )
                      }
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
          </ComponentSearchProvider>
          <ComponentsResizer />
          <PropertiesResizer />
        </div>
      </div>
      <UnsavedChangesDialog
        isOpen={pendingNav !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
        onConfirm={() => pendingNav?.()}
      />
      <CreateTemplateDialog
        isOpen={templateDialogOpen}
        onOpenChange={(open) => setTemplateDialogOpen(open)}
        onConfirm={handleCreateTemplate}
        saving={templateSaving}
      />
    </VersionHistoryProvider>
  );
};

// ---------------------------------------------------------------------------
// ContentPreviewRoute
// ---------------------------------------------------------------------------

const ContentPreviewRoute: React.FC<ContentEditorRouteProps> = ({ config, backButton }) => {
  const intl = useIntl();
  const { contentKey } = useParams<{ contentKey: string }>();
  const history = useHistory();
  const location = useLocation();
  const contentName =
    (location.state as { contentName?: string } | null)?.contentName ??
    contentKey ??
    intl.formatMessage({ id: 'ContentManager.defaultContentName' });

  return (
    <div>
      <div style={NAV_BAR_STYLE}>
        {backButton}
        {backButton && <Text color="neutral.11">/</Text>}
        <Button variant="ghost" onPress={() => history.push('/')}>
          <Icon as={ChevronLeft} /> <FormattedMessage id="ContentManager.contentItemsTitle" />
        </Button>
        <Text color="neutral.11">/</Text>
        <Button
          variant="ghost"
          onPress={() => history.push(`/${contentKey}`, { contentName })}
        >
          {contentName}
        </Button>
        <Badge colorPalette="primary" size="xs">
          <FormattedMessage id="ContentManager.previewBadge" />
        </Badge>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="outline" size="xs" onPress={() => history.goBack()}>
            <Icon as={Close} /> <FormattedMessage id="ContentManager.closePreview" />
          </Button>
        </div>
      </div>
      <PuckRenderer type="content" contentKey={contentKey} mode="preview" config={config} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inner router component
// ---------------------------------------------------------------------------

interface ContentManagerRouterInnerProps {
  config?: Config;
  defaultContentType?: string;
  backButton?: ReactNode;
}

const ContentManagerRouterInner: React.FC<ContentManagerRouterInnerProps> = ({
  config: configProp,
  defaultContentType,
  backButton,
}) => {
  const intl = useIntl();
  // Build a locale-aware default config unless the host supplied one.
  const config = useMemo(
    () => configProp ?? createDefaultPuckConfig(intl),
    [configProp, intl]
  );
  return (
    <Switch>
      <Route
        exact
        path="/"
        render={() => (
          <ContentListRoute defaultContentType={defaultContentType} backButton={backButton} />
        )}
      />
      {/* Preview must precede the catch-all editor route ("/:contentKey" also
          matches "/:contentKey/preview" because it is not exact). */}
      <Route
        path="/:contentKey/preview"
        render={() => <ContentPreviewRoute config={config} backButton={backButton} />}
      />
      <Route
        path="/:contentKey"
        render={() => <ContentEditorRoute config={config} backButton={backButton} />}
      />
    </Switch>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface ContentManagerProps {
  /** URL path where this manager is mounted, e.g. "/content" — used as router basename */
  parentUrl: string;
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  /** Content locale (e.g. "en-US") used for locale-aware calls like product search */
  locale?: string;
  /** Puck component config — passed to editor and preview. Defaults to a locale-aware config. */
  config?: Config;
  defaultContentType?: string;
  /** Optional element rendered before the breadcrumb in the editor header */
  backButton?: ReactNode;
  /**
   * Optional per-key overrides for UI strings, applied on top of the resolved
   * locale catalog. Keys are message ids (e.g. "ContentManager.contentItemsTitle").
   */
  messageOverrides?: Record<string, string>;
}

export const ContentManager: React.FC<ContentManagerProps> = ({
  parentUrl,
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  config,
  defaultContentType,
  backButton,
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
        <BrowserRouter basename={parentUrl}>
          <ContentManagerRouterInner
            config={config}
            defaultContentType={defaultContentType}
            backButton={backButton}
          />
        </BrowserRouter>
      </PuckApiProvider>
    </EnsureIntlProvider>
  </EnsureNimbusProvider>
);
