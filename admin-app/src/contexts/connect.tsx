import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { useAuth } from './auth';
import { useSharedCredentialsFetcher } from '../hooks/use-shared-custom-object-storage';
import ConnectProject from '../components/connect-project';
import { LoadingSpinner, Stack } from '@commercetools/nimbus';

interface ConnectProviderProps {
  children: ReactNode;
}

interface Credentials {
  clientId: string;
  clientSecret: string;
}

interface ConnectContextValue {
  getCredentials: () => Credentials | null;
}

const ConnectContext = createContext<ConnectContextValue | undefined>(
  undefined
);

/**
 * ConnectProvider checks if the project is authenticated with a valid JWT token.
 * If not authenticated, it renders the ConnectProject component to guide the user
 * through the authentication process. Otherwise, it renders the children.
 */
export const ConnectProvider: React.FC<ConnectProviderProps> = ({
  children,
}) => {
  const {
    isAuthenticated,
    loading: authLoading,
    refreshJwt,
    isExpired,
    isRefreshing,
  } = useAuth();
  const { credentials, loading: credentialsLoading } =
    useSharedCredentialsFetcher();

  useEffect(() => {
    if (isAuthenticated && isExpired) {
      refreshJwt();
    }
  }, [isExpired, isAuthenticated, refreshJwt]);

  if (credentialsLoading || authLoading || isRefreshing) {
    return (
      <Stack direction="column" alignItems="center" gap="600">
        <LoadingSpinner size="lg" />
      </Stack>
    );
  }

  if (!credentials || !isAuthenticated) {
    return <ConnectProject />;
  }

  const getCredentials = (): Credentials | null => {
    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      return null;
    }
    return credentials;
  };

  const value: ConnectContextValue = {
    getCredentials,
  };

  return (
    <ConnectContext.Provider value={value}>{children}</ConnectContext.Provider>
  );
};

export const useConnect = () => {
  const context = useContext(ConnectContext);
  if (context === undefined) {
    throw new Error('useConnect must be used within a ConnectProvider');
  }
  return context;
};
