import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import type { MediaFile } from './types';
import {
  Button,
  FormField,
  IconButton,
  LoadingSpinner,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { Close } from '@commercetools/nimbus-icons';
import { EnsureNimbusProvider } from './EnsureNimbusProvider';
import { EnsureIntlProvider } from './EnsureIntlProvider';

// ---------------------------------------------------------------------------
// Upload modal
// ---------------------------------------------------------------------------

interface UploadModalProps {
  uploading: boolean;
  error: string | null;
  imagesOnly: boolean;
  onUpload: (file: File, title: string, description: string) => void;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  uploading,
  error,
  imagesOnly,
  onUpload,
  onClose,
}) => {
  const intl = useIntl();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Text as="h4" fontSize="xl" fontWeight="700">
            <FormattedMessage id="ImagePicker.uploadTitle" />
          </Text>
          <IconButton
            aria-label={intl.formatMessage({ id: 'ImagePicker.close' })}
            variant="ghost"
            size="xs"
            onPress={onClose}
          >
            <Close />
          </IconButton>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <Stack direction="column" gap="400">
            <FormField.Root>
              <FormField.Label>
                <FormattedMessage id="ImagePicker.titleLabel" />
              </FormField.Label>
              <FormField.Input>
                <TextInput
                  value={title}
                  onChange={(value) => setTitle(value)}
                  placeholder={intl.formatMessage({ id: 'ImagePicker.titlePlaceholder' })}
                />
              </FormField.Input>
            </FormField.Root>
            <FormField.Root>
              <FormField.Label>
                <FormattedMessage id="ImagePicker.descriptionLabel" />
              </FormField.Label>
              <FormField.Input>
                <TextInput
                  value={description}
                  onChange={(value) => setDescription(value)}
                  placeholder={intl.formatMessage({ id: 'ImagePicker.descriptionPlaceholder' })}
                />
              </FormField.Input>
            </FormField.Root>
            <div
              style={{
                border: dragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
                borderRadius: '6px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                color: dragging ? '#3b82f6' : '#6b7280',
                fontSize: '13px',
                transition: 'border-color .2s',
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <>
                  <div>📎 {file.name}</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', color: '#9ca3af' }}>
                    <FormattedMessage
                      id="ImagePicker.fileSize"
                      values={{ size: (file.size / 1024).toFixed(0) }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  📁 <FormattedMessage id="ImagePicker.dropzoneHint" />
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={imagesOnly ? 'image/*' : '*/*'}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            {error && <Text color="critical.11">{error}</Text>}
          </Stack>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            gap: '12px',
          }}
        >
          <Text fontSize="sm" color="neutral.11" truncate>
            {file?.name ?? intl.formatMessage({ id: 'ImagePicker.noFileSelected' })}
          </Text>
          <Stack direction="row" gap="200">
            <Button variant="outline" onPress={onClose}>
              <FormattedMessage id="ImagePicker.cancel" />
            </Button>
            <Button
              variant="solid"
              isDisabled={!file || uploading}
              onPress={() => file && onUpload(file, title, description)}
            >
              {uploading ? (
                <FormattedMessage id="ImagePicker.uploading" />
              ) : (
                <FormattedMessage id="ImagePicker.uploadAction" />
              )}
            </Button>
          </Stack>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Library modal
// ---------------------------------------------------------------------------

interface LibraryModalProps {
  files: MediaFile[];
  pagination: { currentPage: number; totalPages: number };
  loading: boolean;
  error: string | null;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelect: (file: MediaFile) => void;
  onClose: () => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({
  files,
  pagination,
  loading,
  error,
  onNextPage,
  onPrevPage,
  onSelect,
  onClose,
}) => {
  const intl = useIntl();
  const [selected, setSelected] = useState<MediaFile | null>(null);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Text as="h4" fontSize="xl" fontWeight="700">
            <FormattedMessage id="ImagePicker.libraryTitle" />
          </Text>
          <IconButton
            aria-label={intl.formatMessage({ id: 'ImagePicker.close' })}
            variant="ghost"
            size="xs"
            onPress={onClose}
          >
            <Close />
          </IconButton>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
              <LoadingSpinner />
            </div>
          ) : files.length === 0 ? (
            <Text color="neutral.11">
              <FormattedMessage id="ImagePicker.noFilesFound" />
            </Text>
          ) : (
            <Stack direction="column" gap="400">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '12px',
                }}
              >
                {files.map((file) => (
                  <div
                    key={file.url}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: `2px solid ${selected?.url === file.url ? '#3b82f6' : 'transparent'}`,
                      borderRadius: '6px',
                      padding: '6px',
                      background: selected?.url === file.url ? 'rgba(59,130,246,0.07)' : '#f9fafb',
                    }}
                    onClick={() => setSelected(file)}
                    title={file.title ?? file.name}
                  >
                    {file.isImage ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', background: '#e5e7eb' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '4px',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                        }}
                      >
                        📄
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '11px',
                        textAlign: 'center',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#374151',
                      }}
                    >
                      {file.title ?? file.name}
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <Stack direction="row" gap="200" alignItems="center" justifyContent="center">
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={pagination.currentPage <= 1}
                    onPress={onPrevPage}
                  >
                    <FormattedMessage id="ImagePicker.prevPage" />
                  </Button>
                  <Text fontSize="sm" color="neutral.11">
                    <FormattedMessage
                      id="ImagePicker.pageIndicator"
                      values={{
                        current: pagination.currentPage,
                        total: pagination.totalPages,
                      }}
                    />
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={pagination.currentPage >= pagination.totalPages}
                    onPress={onNextPage}
                  >
                    <FormattedMessage id="ImagePicker.nextPage" />
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
          {error && <Text color="critical.11">{error}</Text>}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            gap: '12px',
          }}
        >
          <Text fontSize="sm" color="neutral.11" truncate>
            {selected
              ? (selected.title ?? selected.name)
              : intl.formatMessage({ id: 'ImagePicker.nothingSelected' })}
          </Text>
          <Stack direction="row" gap="200">
            <Button variant="outline" onPress={onClose}>
              <FormattedMessage id="ImagePicker.cancel" />
            </Button>
            <Button variant="solid" isDisabled={!selected} onPress={handleConfirm}>
              <FormattedMessage id="ImagePicker.select" />
            </Button>
          </Stack>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ImagePickerField — standalone field component
// ---------------------------------------------------------------------------

/**
 * Derives a friendly file name from an image URL for display, avoiding
 * exposing the raw (often long / technical) URL to non-technical users.
 * Returns null when no meaningful name can be extracted (e.g. data URLs).
 */
const getDisplayNameFromUrl = (url: string): string | null => {
  if (!url || url.startsWith('data:')) return null;
  try {
    // Strip query/hash, then take the last path segment.
    const pathname = url.split(/[?#]/)[0];
    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return null;
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  } catch {
    return null;
  }
};

export interface ImagePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Only show images (default: true) */
  imagesOnly?: boolean;
  /** Content locale (e.g. "en-US"). Resolves to en/es; unsupported → en. */
  locale?: string;
  /** Per-key message overrides applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  value,
  onChange,
  imagesOnly = true,
  locale,
  messageOverrides,
}) => {
  const {
    files,
    pagination,
    loading,
    uploading,
    error,
    fetchMedia,
    uploadFile,
    loadNextPage,
    loadPreviousPage,
  } = useMediaLibrary();

  const [showUpload, setShowUpload] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const extensions = imagesOnly ? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] : [];

  const openLibrary = useCallback(() => {
    void fetchMedia(extensions, 1, 20);
    setShowLibrary(true);
  }, [fetchMedia, extensions]);

  const handleUpload = useCallback(
    async (file: File, title: string, description: string) => {
      const mediaFile = await uploadFile(file, title, description);
      onChange(mediaFile.url);
      setShowUpload(false);
    },
    [uploadFile, onChange]
  );

  const handleSelect = useCallback(
    (file: MediaFile) => {
      onChange(file.url);
      setShowLibrary(false);
    },
    [onChange]
  );

  // Close modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUpload(false);
        setShowLibrary(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
      <EnsureNimbusProvider locale={locale}>
        <Stack direction="column" gap="200">
          {value ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#f9fafb',
              }}
            >
              <img
                src={value}
                alt=""
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fontSize="sm" color="neutral.11" truncate>
                  {getDisplayNameFromUrl(value) ?? (
                    <FormattedMessage id="ImagePicker.imageSelected" />
                  )}
                </Text>
              </div>
              <Button variant="ghost" colorPalette="critical" size="xs" onPress={() => onChange('')}>
                <FormattedMessage id="ImagePicker.remove" />
              </Button>
            </div>
          ) : (
            <Text fontSize="sm" color="neutral.11">
              <FormattedMessage id="ImagePicker.noImageSelected" />
            </Text>
          )}

          <Stack direction="row" gap="200">
            <Button variant="outline" onPress={() => setShowUpload(true)}>
              <FormattedMessage id="ImagePicker.upload" />
            </Button>
            <Button variant="solid" onPress={openLibrary}>
              <FormattedMessage id="ImagePicker.mediaLibrary" />
            </Button>
          </Stack>

          {showUpload && (
            <UploadModal
              uploading={uploading}
              error={error}
              imagesOnly={imagesOnly}
              onUpload={(file, title, desc) => void handleUpload(file, title, desc)}
              onClose={() => setShowUpload(false)}
            />
          )}

          {showLibrary && (
            <LibraryModal
              files={files}
              pagination={pagination}
              loading={loading}
              error={error}
              onNextPage={() => void loadNextPage(extensions)}
              onPrevPage={() => void loadPreviousPage(extensions)}
              onSelect={handleSelect}
              onClose={() => setShowLibrary(false)}
            />
          )}
        </Stack>
      </EnsureNimbusProvider>
    </EnsureIntlProvider>
  );
};
