import { useCallback } from 'react';
import type { ApolloError } from '@apollo/client';

import {
  CONFIGURATION_CONTAINER,
  JWT_TOKEN_KEY,
  CREDENTIALS_KEY,
} from '../../constants';
import {
  useCustomObjectFetcher,
  useCustomObjectSetter,
} from '../use-custom-objects';

// Specific hook for JWT token fetcher
type TUseSharedJwtTokenFetcher = () => {
  jwtToken?: string;
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

// Specific hook for JWT token setter
type TUseSharedJwtTokenSetter = () => {
  setJwtToken: (token: string | null) => Promise<void>;
  error?: ApolloError;
  loading: boolean;
};

// Specific hook for credentials fetcher
export type TCredentials = {
  clientId: string;
  clientSecret: string;
};

type TUseSharedCredentialsFetcher = () => {
  credentials?: TCredentials;
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

export const useSharedJwtTokenFetcher: TUseSharedJwtTokenFetcher = () => {
  const { value, error, loading, refetch } = useCustomObjectFetcher(
    CONFIGURATION_CONTAINER,
    JWT_TOKEN_KEY
  );

  return {
    jwtToken: value,
    error,
    loading,
    refetch,
  };
};

export const useSharedJwtTokenSetter: TUseSharedJwtTokenSetter = () => {
  const { setValue, error, loading } = useCustomObjectSetter(
    CONFIGURATION_CONTAINER,
    JWT_TOKEN_KEY
  );

  return {
    setJwtToken: (token: string | null) =>
      setValue(token ? `"${token}"` : null),
    error,
    loading,
  };
};

export const useSharedCredentialsFetcher: TUseSharedCredentialsFetcher = () => {
  const { value, error, loading, refetch } = useCustomObjectFetcher(
    CONFIGURATION_CONTAINER,
    CREDENTIALS_KEY
  );

  let credentials: TCredentials | undefined;

  if (value) {
    try {
      credentials =
        typeof value === 'string' ? JSON.parse(value) : (value as TCredentials);
    } catch (err) {
      console.error('Failed to parse credentials:', err);
    }
  }

  return {
    credentials,
    error,
    loading,
    refetch,
  };
};

// Specific hook for credentials setter
type TUseSharedCredentialsSetter = () => {
  setCredentials: (credentials: TCredentials | null) => Promise<void>;
  error?: ApolloError;
  loading: boolean;
};

export const useSharedCredentialsSetter: TUseSharedCredentialsSetter = () => {
  const { setValue, error, loading } = useCustomObjectSetter(
    CONFIGURATION_CONTAINER,
    CREDENTIALS_KEY
  );

  const setCredentials = useCallback(
    async (credentials: TCredentials | null) => {
      if (!credentials) {
        console.log('Credentials cleared (no deletion)');
        return;
      }

      try {
        const jsonString = JSON.stringify(credentials);
        await setValue(jsonString);
      } catch (err) {
        console.error('Failed to save credentials to custom object:', err);
        throw err;
      }
    },
    [setValue]
  );

  return {
    setCredentials,
    error,
    loading,
  };
};
