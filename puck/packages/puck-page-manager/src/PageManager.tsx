import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Switch,
  Route,
  useHistory,
  useParams,
  useLocation,
} from 'react-router-dom';
import { useIntl, FormattedMessage, type MessageDescriptor } from 'react-intl';
import {
  PuckApiProvider,
  usePuckPages,
  usePuckTemplates,
  usePuckApiContext,
} from '@commercetools-demo/puck-api';
import {
  ComponentsResizer,
  PropertiesResizer,
  PuckEditor,
  UnsavedChangesDialog,
  createDefaultPuckConfig,
} from '@commercetools-demo/puck-editor';
import { PuckRenderer } from '@commercetools-demo/puck-renderer';
import { EnsureIntlProvider } from './EnsureIntlProvider';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';
import type { Config } from '@measured/puck';
import type { CreatePuckPageInput, PuckPageListItem } from '@commercetools-demo/puck-types';
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
// Status badge
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<
  'draft' | 'published' | 'none',
  { colorPalette: 'warning' | 'positive' | 'neutral'; message: MessageDescriptor }
> = {
  draft: { colorPalette: 'warning', message: { id: 'PageManager.statusDraft' } },
  published: { colorPalette: 'positive', message: { id: 'PageManager.statusPublished' } },
  none: { colorPalette: 'neutral', message: { id: 'PageManager.statusNone' } },
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
// Shared nav bar style
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
// Table row type
// ---------------------------------------------------------------------------

type PageRow = PuckPageListItem & { id: string; [key: string]: unknown };

// ---------------------------------------------------------------------------
// PageList route
// ---------------------------------------------------------------------------

interface PageListProps {
  backButton?: ReactNode;
}

const PageList: React.FC<PageListProps> = ({ backButton }) => {
  const intl = useIntl();
  const history = useHistory();
  const { pages, loading, error, createPage, deletePage, refresh } = usePuckPages();
  const { templates } = usePuckTemplates('page');

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  // Selected template for the new page ('' = Empty, today's behaviour).
  const [templateKey, setTemplateKey] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  // Page targeted by the (Nimbus) delete-confirmation dialog.
  const [pendingDelete, setPendingDelete] = useState<PuckPageListItem | null>(null);
  // Free-text filter over page name / slug.
  const [search, setSearch] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) { setFormError(intl.formatMessage({ id: 'PageManager.validationNameRequired' })); return; }
    if (!newSlug.trim()) { setFormError(intl.formatMessage({ id: 'PageManager.validationSlugRequired' })); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const input: CreatePuckPageInput = {
        name: newName.trim(),
        slug: newSlug.trim().startsWith('/') ? newSlug.trim() : `/${newSlug.trim()}`,
      };
      // Seed from the selected template (Empty leaves puckData unset).
      if (templateKey) {
        const template = templates.find((t) => t.key === templateKey);
        if (template) input.puckData = template.value.puckData;
      }
      const created = await createPage(input);
      setCreating(false);
      setNewName('');
      setNewSlug('');
      setTemplateKey('');
      history.push(`/${created.key}/edit`, { pageName: created.value.name });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (page: PuckPageListItem) => {
    setDeleting(page.key);
    try {
      await deletePage(page.key);
      await refresh();
      setPendingDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '64px', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <Text color="critical.11">{intl.formatMessage({ id: 'PageManager.error' }, { message: error })}</Text>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filteredPages = term
    ? pages.filter(
        (p: PuckPageListItem) =>
          p.value.name.toLowerCase().includes(term) ||
          p.value.slug.toLowerCase().includes(term)
      )
    : pages;

  const rows: PageRow[] = filteredPages.map((p: PuckPageListItem) => ({ ...p, id: p.key }));

  const columns: DataTableColumnItem<PageRow>[] = [
    {
      id: 'name',
      header: intl.formatMessage({ id: 'PageManager.columnName' }),
      accessor: (row) => row.value.name,
      render: ({ row }) => <Text fontWeight="bold">{row.value.name}</Text>,
    },
    {
      id: 'slug',
      header: intl.formatMessage({ id: 'PageManager.columnSlug' }),
      accessor: (row) => row.value.slug,
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
          {row.value.slug}
        </code>
      ),
    },
    {
      id: 'status',
      header: intl.formatMessage({ id: 'PageManager.columnStatus' }),
      accessor: () => '',
      isSortable: false,
      render: ({ row }) => (
        <Stack direction="row" gap="100" wrap="wrap">
          {row.states.draft && <StatusBadge variant="draft" />}
          {row.states.published && <StatusBadge variant="published" />}
          {!row.states.draft && !row.states.published && <StatusBadge variant="none" />}
        </Stack>
      ),
    },
    {
      id: 'updatedAt',
      header: intl.formatMessage({ id: 'PageManager.columnUpdated' }),
      accessor: (row) => row.value.updatedAt,
      render: ({ row }) => (
        <Text fontSize="xs" color="neutral.11">
          {new Date(row.value.updatedAt).toLocaleString()}
        </Text>
      ),
    },
    {
      id: 'actions',
      header: intl.formatMessage({ id: 'PageManager.columnActions' }),
      accessor: () => '',
      isSortable: false,
      render: ({ row }) => (
        <Stack direction="row" gap="100" alignItems="center">
          <IconButton
            aria-label={intl.formatMessage({ id: 'PageManager.editAria' }, { name: row.value.name })}
            variant="ghost"
            size="xs"
            onPress={() => history.push(`/${row.key}/edit`, { pageName: row.value.name })}
          >
            <Edit />
          </IconButton>
          <IconButton
            aria-label={intl.formatMessage({ id: 'PageManager.previewAria' }, { name: row.value.name })}
            variant="ghost"
            size="xs"
            onPress={() => history.push(`/${row.key}/preview`, { pageName: row.value.name })}
          >
            <Visibility />
          </IconButton>
          <IconButton
            aria-label={intl.formatMessage({ id: 'PageManager.deleteAria' }, { name: row.value.name })}
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
              <FormattedMessage id="PageManager.pagesTitle" />
            </Text>
          </Stack>
          <Button variant="solid" onPress={() => setCreating(true)}>
            <Icon as={Add} /> <FormattedMessage id="PageManager.newPage" />
          </Button>
        </Stack>

        {creating && (
          <Card.Root variant="outlined">
            <Card.Body>
              <Stack direction="column" gap="400">
                <Text as="h4" fontSize="xl" fontWeight="700">
                  <FormattedMessage id="PageManager.createNewPage" />
                </Text>
                <Stack direction="row" gap="400">
                  <div style={{ flex: 1 }}>
                    <FormField.Root isRequired>
                      <FormField.Label>
                        <FormattedMessage id="PageManager.nameLabel" />
                      </FormField.Label>
                      <FormField.Input>
                        <TextInput
                          value={newName}
                          onChange={(v) => setNewName(v)}
                          placeholder={intl.formatMessage({ id: 'PageManager.namePlaceholder' })}
                        />
                      </FormField.Input>
                    </FormField.Root>
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormField.Root isRequired>
                      <FormField.Label>
                        <FormattedMessage id="PageManager.slugLabel" />
                      </FormField.Label>
                      <FormField.Input>
                        <TextInput
                          value={newSlug}
                          onChange={(v) => setNewSlug(v)}
                          placeholder={intl.formatMessage({ id: 'PageManager.slugPlaceholder' })}
                        />
                      </FormField.Input>
                    </FormField.Root>
                  </div>
                </Stack>
                <FormField.Root>
                  <FormField.Label>
                    <FormattedMessage id="PageManager.templateLabel" />
                  </FormField.Label>
                  <FormField.Input>
                    <Select.Root
                      aria-label={intl.formatMessage({ id: 'PageManager.templateLabel' })}
                      selectedKey={templateKey || 'empty'}
                      onSelectionChange={(key) =>
                        setTemplateKey(key == null || key === 'empty' ? '' : String(key))
                      }
                    >
                      <Select.Options>
                        <Select.Option id="empty">
                          {intl.formatMessage({ id: 'PageManager.templateEmpty' })}
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
                {formError && <Text color="critical.11">{formError}</Text>}
                <Stack direction="row" gap="200">
                  <Button variant="solid" onPress={() => void handleCreate()} isDisabled={submitting}>
                    {submitting
                      ? intl.formatMessage({ id: 'PageManager.creating' })
                      : intl.formatMessage({ id: 'PageManager.create' })}
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => { setCreating(false); setFormError(''); }}
                  >
                    <FormattedMessage id="PageManager.cancel" />
                  </Button>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}

        {pages.length === 0 && !creating ? (
          <Stack direction="column" gap="400" alignItems="center">
            <Text color="neutral.11">
              <FormattedMessage id="PageManager.noPages" />
            </Text>
            <Button variant="solid" onPress={() => setCreating(true)}>
              <Icon as={Add} /> <FormattedMessage id="PageManager.createFirstPage" />
            </Button>
          </Stack>
        ) : pages.length > 0 ? (
          <Stack direction="column" gap="400">
            {/* Search by name or path */}
            <div style={{ maxWidth: 360 }}>
              <TextInput
                aria-label={intl.formatMessage({ id: 'PageManager.searchAria' })}
                placeholder={intl.formatMessage({ id: 'PageManager.searchPlaceholder' })}
                value={search}
                onChange={(v) => setSearch(v)}
                width="100%"
                trailingElement={
                  search !== '' ? (
                    <IconButton
                      aria-label={intl.formatMessage({ id: 'PageManager.clearSearch' })}
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
            {/* DataTable always renders an internal "pin rows" column with no
                public prop to disable it — hide it (header + body cells) for
                this list only. The table uses table-layout:fixed, so the column
                collapses cleanly. */}
            <div className="puck-page-list">
              <style>{`
                .puck-page-list .pin-rows-column-header,
                .puck-page-list [data-slot="pin-row-cell"] { display: none !important; }
              `}</style>
              <DataTable
                columns={columns}
                rows={rows}
                aria-label={intl.formatMessage({ id: 'PageManager.pagesTitle' })}
              />
            </div>
          </Stack>
        ) : null}
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
              <FormattedMessage id="PageManager.deletePageTitle" />
            </Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Text>
              <FormattedMessage
                id="PageManager.deleteConfirm"
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
              <FormattedMessage id="PageManager.cancel" />
            </Button>
            <Button
              colorPalette="critical"
              isDisabled={deleting !== null}
              onPress={() => {
                if (pendingDelete) void handleDelete(pendingDelete);
              }}
            >
              {deleting !== null
                ? intl.formatMessage({ id: 'PageManager.deleting' })
                : intl.formatMessage({ id: 'PageManager.delete' })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PageEditorRoute
// ---------------------------------------------------------------------------

interface RouteProps {
  config: Config;
  backButton?: ReactNode;
}

const PageEditorRoute: React.FC<RouteProps> = ({ config, backButton }) => {
  const intl = useIntl();
  const { pageKey } = useParams<{ pageKey: string }>();
  const history = useHistory();
  const location = useLocation();
  const { baseURL, projectKey, businessUnitKey, jwtToken, locale } = usePuckApiContext();
  const pageName =
    (location.state as { pageName?: string } | null)?.pageName ??
    pageKey ??
    intl.formatMessage({ id: 'PageManager.defaultPageName' });

  // Unsaved-changes navigation guard. `pendingNav` holds the deferred
  // navigation until the user confirms in the Nimbus dialog.
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  const guardedNavigate = useCallback(
    (navFn: () => void) => {
      if (isDirty) {
        setPendingNav(() => navFn);
      } else {
        navFn();
      }
    },
    [isDirty]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={NAV_BAR_STYLE}>
        {backButton}
        {backButton && <Text color="neutral.11">/</Text>}
        <Button
          variant="ghost"
          onPress={() => guardedNavigate(() => history.push('/'))}
        >
          <Icon as={ChevronLeft} /> <FormattedMessage id="PageManager.pagesTitle" />
        </Button>
        <Text color="neutral.11">/</Text>
        <Text fontWeight="bold">{pageName}</Text>
      </div>
      <div className="puck-editor-fill" style={{ flex: 1, overflow: 'hidden' }}>
        <PuckEditor
          baseURL={baseURL}
          projectKey={projectKey}
          businessUnitKey={businessUnitKey}
          jwtToken={jwtToken ?? ''}
          locale={locale}
          pageKey={pageKey!}
          config={config}
          onDirtyChange={setIsDirty}
          onPreview={() =>
            guardedNavigate(() =>
              history.push(`/${pageKey}/preview`, { pageName })
            )
          }
          onError={(err: Error) => { console.error('[PageManager] editor error:', err); }}
        />
        <ComponentsResizer />
        <PropertiesResizer />
      </div>
      <UnsavedChangesDialog
        isOpen={pendingNav !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
        onConfirm={() => pendingNav?.()}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// PagePreviewRoute
// ---------------------------------------------------------------------------

const PagePreviewRoute: React.FC<RouteProps> = ({ config, backButton }) => {
  const intl = useIntl();
  const { pageKey } = useParams<{ pageKey: string }>();
  const history = useHistory();
  const location = useLocation();
  const pageName =
    (location.state as { pageName?: string } | null)?.pageName ??
    pageKey ??
    intl.formatMessage({ id: 'PageManager.defaultPageName' });

  return (
    <div>
      <div style={NAV_BAR_STYLE}>
        {backButton}
        {backButton && <Text color="neutral.11">/</Text>}
        <Button variant="ghost" onPress={() => history.push('/')}>
          <Icon as={ChevronLeft} /> <FormattedMessage id="PageManager.pagesTitle" />
        </Button>
        <Text color="neutral.11">/</Text>
        <Text fontWeight="bold">{pageName}</Text>
        <Badge colorPalette="primary" size="xs">
          <FormattedMessage id="PageManager.previewBadge" />
        </Badge>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="outline" size="xs" onPress={() => history.goBack()}>
            <Icon as={Close} /> <FormattedMessage id="PageManager.closePreview" />
          </Button>
        </div>
      </div>
      <PuckRenderer pageKey={pageKey} mode="preview" config={config} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inner router component
// ---------------------------------------------------------------------------

interface PageManagerInnerProps {
  config?: Config;
  backButton?: ReactNode;
}

const PageManagerInner: React.FC<PageManagerInnerProps> = ({
  config: configProp,
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
      <Route exact path="/" render={() => <PageList backButton={backButton} />} />
      <Route
        path="/:pageKey/edit"
        render={() => <PageEditorRoute config={config} backButton={backButton} />}
      />
      <Route
        path="/:pageKey/preview"
        render={() => <PagePreviewRoute config={config} backButton={backButton} />}
      />
    </Switch>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface PageManagerProps {
  /** URL path where this manager is mounted, e.g. "/pages" — used as router basename */
  parentUrl: string;
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  /** Content locale (e.g. "en-US") used for locale-aware calls like product search */
  locale?: string;
  /** Puck component config — passed to editor and preview. Defaults to defaultPuckConfig. */
  config?: Config;
  /** Optional element rendered before the breadcrumb in editor/preview headers */
  backButton?: ReactNode;
  /**
   * Optional per-key overrides for UI strings, applied on top of the resolved
   * locale catalog. Keys are message ids (e.g. "PageManager.pagesTitle").
   */
  messageOverrides?: Record<string, string>;
}

export const PageManager: React.FC<PageManagerProps> = ({
  parentUrl,
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  config,
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
          <PageManagerInner config={config} backButton={backButton} />
        </BrowserRouter>
      </PuckApiProvider>
    </EnsureIntlProvider>
  </EnsureNimbusProvider>
);
