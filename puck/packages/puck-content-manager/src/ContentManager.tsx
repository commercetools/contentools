import React, { useState } from 'react';
import { useIntl, FormattedMessage, type MessageDescriptor } from 'react-intl';
import {
  PuckApiProvider,
  usePuckContents,
  usePuckTemplates,
} from '@commercetools-demo/puck-api';
import type {
  CreatePuckContentInput,
  PuckContentListItem,
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
import { Add, Close, Delete, Edit } from '@commercetools/nimbus-icons';
import { EnsureIntlProvider } from './EnsureIntlProvider';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';

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
// Row type for DataTable
// ---------------------------------------------------------------------------

type ContentRow = PuckContentListItem & { id: string; [key: string]: unknown };

// ---------------------------------------------------------------------------
// Inner list component (uses context)
// ---------------------------------------------------------------------------

interface ContentListProps {
  defaultContentType?: string;
  onEdit: (item: PuckContentListItem) => void;
}

const ContentList: React.FC<ContentListProps> = ({ defaultContentType, onEdit }) => {
  const intl = useIntl();
  const { contents, loading, error, createContent, deleteContent } =
    usePuckContents(defaultContentType);
  const { templates } = usePuckTemplates('content');

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState(defaultContentType ?? '');
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
      await createContent(input);
      setShowCreate(false);
      setCreateName('');
      setCreateType(defaultContentType ?? '');
      setTemplateKey('');
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
            onPress={() => onEdit(row)}
          >
            <Edit />
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
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Text as="h1" fontSize="2xl" fontWeight="700">
            <FormattedMessage id="ContentManager.contentItemsTitle" />
          </Text>
          <Button variant="solid" onPress={() => setShowCreate((v) => !v)}>
            <Icon as={Add} /> <FormattedMessage id="ContentManager.newContent" />
          </Button>
        </Stack>

        {/* Create form */}
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

        {/* Search by name or content type */}
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

        {/* Table */}
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
// Public component — wraps its own PuckApiProvider
// ---------------------------------------------------------------------------

export interface ContentManagerListProps {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  defaultContentType?: string;
  onEdit: (item: PuckContentListItem) => void;
  /**
   * Optional per-key overrides for UI strings, applied on top of the resolved
   * locale catalog. Keys are message ids (e.g. "ContentManager.contentItemsTitle").
   */
  messageOverrides?: Record<string, string>;
}

export const ContentManagerList: React.FC<ContentManagerListProps> = ({
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  defaultContentType,
  onEdit,
  messageOverrides,
}) => (
  <EnsureNimbusProvider>
    <EnsureIntlProvider messageOverrides={messageOverrides}>
      <PuckApiProvider
        baseURL={baseURL}
        projectKey={projectKey}
        businessUnitKey={businessUnitKey}
        jwtToken={jwtToken}
      >
        <ContentList defaultContentType={defaultContentType} onEdit={onEdit} />
      </PuckApiProvider>
    </EnsureIntlProvider>
  </EnsureNimbusProvider>
);
