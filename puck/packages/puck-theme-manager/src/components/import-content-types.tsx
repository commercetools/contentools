import React, { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { PuckApiProvider, usePuckContentType } from '@commercetools-demo/puck-api';
import type { ImportResult } from '@commercetools-demo/puck-types';
import { Button, Card, Stack, Text } from '@commercetools/nimbus';
import { EnsureNimbusProvider } from '../EnsureNimbusProvider';
import { EnsureIntlProvider } from '../EnsureIntlProvider';

interface InnerProps {
  backButton?: {
    label: string;
    onClick: () => void;
    icon: React.ReactElement;
  };
}

export interface ImportContentTypesProps extends InnerProps {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  /** Content locale (e.g. "en-US"). Resolves to en/es; unsupported → en. */
  locale?: string;
  /** Per-key overrides for UI strings, applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

const ImportContentTypesInner: React.FC<InnerProps> = ({ backButton }) => {
  const history = useHistory();
  const intl = useIntl();
  const { importDefaultContentTypes, loading, error, clearError } =
    usePuckContentType();
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleBack = useCallback(() => {
    if (backButton?.onClick) {
      backButton.onClick();
    } else {
      history.push('/');
    }
  }, [backButton, history]);

  const handleImport = useCallback(async () => {
    clearError();
    setResult(null);
    try {
      const importResult = await importDefaultContentTypes();
      setResult(importResult);
    } catch {
      // Error is set by the hook
    }
  }, [importDefaultContentTypes, clearError]);

  return (
    <Stack direction="column" gap="600">
      {backButton && (
        <Button variant="ghost" onPress={handleBack}>
          {backButton.icon}
          {backButton.label}
        </Button>
      )}
      <Text as="h1" fontSize="2xl" fontWeight="700">
        <FormattedMessage id="ThemeManager.importTitle" />
      </Text>
      <Text color="neutral.11">
        <FormattedMessage id="ThemeManager.importIntro" />
      </Text>

      {error && (
        <Card.Root variant="outlined">
          <Card.Body>
            <Stack direction="column" gap="400">
              <Text as="h2" fontSize="xl" fontWeight="700">
                <FormattedMessage id="ThemeManager.errorHeading" />
              </Text>
              <Text color="critical.11">{error}</Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      )}

      <Stack direction="row" gap="400" justifyContent="center">
        <Button variant="solid" onPress={handleImport} isDisabled={loading}>
          {loading
            ? intl.formatMessage({ id: 'ThemeManager.importing' })
            : intl.formatMessage({ id: 'ThemeManager.importButton' })}
        </Button>
      </Stack>
      {result && (
        <Card.Root variant="outlined">
          <Card.Body>
            <Stack direction="column" gap="400">
              <Text as="h2" fontSize="xl" fontWeight="700">
                <FormattedMessage id="ThemeManager.resultHeading" />
              </Text>
              <Text>
                <FormattedMessage
                  id="ThemeManager.importedCount"
                  values={{ count: result.imported.length }}
                />
              </Text>
              {result.imported.length > 0 && (
                <Text color="neutral.11">
                  {result.imported.join(', ')}
                </Text>
              )}
              {result.failed.length > 0 && (
                <>
                  <Text color="critical.11">
                    <FormattedMessage
                      id="ThemeManager.failedCount"
                      values={{ count: result.failed.length }}
                    />
                  </Text>
                  <Stack direction="column" gap="200">
                    {result.failed.map(({ key, error: err }) => (
                      <Text key={key} color="critical.11">
                        <FormattedMessage
                          id="ThemeManager.failedItem"
                          values={{ key, error: err }}
                        />
                      </Text>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  );
};

const ImportContentTypes: React.FC<ImportContentTypesProps> = ({
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  messageOverrides,
  ...innerProps
}) => (
  <PuckApiProvider
    baseURL={baseURL}
    projectKey={projectKey}
    businessUnitKey={businessUnitKey}
    jwtToken={jwtToken}
  >
    <EnsureNimbusProvider locale={locale}>
      <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
        <ImportContentTypesInner {...innerProps} />
      </EnsureIntlProvider>
    </EnsureNimbusProvider>
  </PuckApiProvider>
);

export default ImportContentTypes;
