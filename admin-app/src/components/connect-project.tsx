import { useState } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import {
  Button,
  Card,
  Heading,
  LoadingSpinner,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { useCreateApiClient } from '../hooks/use-create-api-client';
import { useContentoolsApi } from '../hooks/use-contentools-api';
import { useAuth } from '../contexts/auth';
import { useSharedCredentialsSetter } from '../hooks/use-shared-custom-object-storage';
import styled from 'styled-components';

const StyledDiv = styled.div`
  padding: 16px;
`;

const ConnectProject = () => {
  const applicationContext = useApplicationContext();
  const { project, environment } = applicationContext;

  const { createApiClient, loading: creatingApiClient } = useCreateApiClient(
    project?.key ?? ''
  );
  const { authenticateProject } = useContentoolsApi();
  const { setJwtToken } = useAuth();
  const { setCredentials } = useSharedCredentialsSetter();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiClientError, setApiClientError] = useState<string>('');
  const [apiClientResult, setApiClientResult] = useState<{
    clientId: string;
    clientSecret: string;
    name: string;
    scope: string;
  } | null>(null);

  const handleCreateApiClient = async () => {
    try {
      setApiClientError('');
      const result = await createApiClient();
      setApiClientResult(result);
    } catch (err) {
      setApiClientError(
        err instanceof Error ? err.message : 'Failed to create API client'
      );
    }
  };

  const handleConnect = async () => {
    if (!apiClientResult) {
      setError('API client must be created first');
      return;
    }

    if (!project?.key) {
      setError('Project key is required');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const response = await authenticateProject({
        ct_client_id: apiClientResult.clientId,
        ct_client_secret: apiClientResult.clientSecret,
        ct_project_key: project.key,
        ct_scope: apiClientResult.scope,
        ct_region: (environment as { location?: string })?.location ?? '',
      });

      await setCredentials({
        clientId: apiClientResult.clientId,
        clientSecret: apiClientResult.clientSecret,
      });

      await setJwtToken(response.token);

      setSuccess(true);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect project'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledDiv>
      <Stack direction="column" gap="600">
        <Heading as="h1" size="lg">
          Configuration Wizard
        </Heading>
        <Text>Connect your project to Contentools</Text>

        <Card.Root variant="outlined-elevated">
          <Card.Body>
            <Stack direction="column" gap="400">
              <Heading as="h4" size="xs" fontWeight="medium">
                Create an API client for connection
              </Heading>

              {!apiClientResult ? (
                <Stack direction="column" gap="300">
                  <Text>
                    Create a new API client to use for connecting your project.
                  </Text>
                  <Stack direction="row" gap="300" justifyContent="flex-start">
                    <Button
                      variant="outline"
                      colorPalette="primary"
                      onPress={handleCreateApiClient}
                      isDisabled={creatingApiClient}
                    >
                      Create API Client
                      {creatingApiClient && <LoadingSpinner size="xs" />}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction="column" gap="300">
                  <Text color="positive.11">
                    API Client created successfully!
                  </Text>
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Client ID:</strong> {apiClientResult.clientId}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Client Secret:</strong> ••••••••••••••••
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Name:</strong> {apiClientResult.name}
                    </div>
                    <div>
                      <strong>Scope:</strong> {apiClientResult.scope}
                    </div>
                  </div>
                </Stack>
              )}

              {apiClientError && (
                <Text color="critical.11">{apiClientError}</Text>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>

        {error && (
          <Card.Root variant="outlined">
            <Card.Body>
              <Text color="critical.11">{error}</Text>
            </Card.Body>
          </Card.Root>
        )}

        {success && (
          <Card.Root variant="outlined">
            <Card.Body>
              <Text color="positive.11">Successfully connected project!</Text>
            </Card.Body>
          </Card.Root>
        )}
        <Stack direction="row" gap="400">
          <Button
            variant="solid"
            colorPalette="primary"
            onPress={handleConnect}
            isDisabled={loading || success || !apiClientResult}
          >
            Connect
            {loading && <LoadingSpinner size="xs" />}
          </Button>
        </Stack>
      </Stack>
    </StyledDiv>
  );
};

ConnectProject.displayName = 'ConnectProject';

export default ConnectProject;
