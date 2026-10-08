import { ApolloError } from '@apollo/client';
import FetchCustomObjectQuery from './fetch-custom-object.ctp.graphql';
import SetCustomObjectMutation from './set-custom-object.graphql';
import {
  useMcQuery,
  useMcMutation,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import { useCallback } from 'react';

// Generic hook to set custom object value
type TUseCustomObjectSetter = (
  container: string,
  key: string
) => {
  setValue: (value: string | null) => Promise<void>;
  error?: ApolloError;
  loading: boolean;
};

type TFetchCustomObjectQuery = {
  customObject?: {
    id: string;
    version: number;
    container: string;
    key: string;
    value: string;
  };
};

type TFetchCustomObjectQueryVariables = {
  container: string;
  key: string;
};

type TSetCustomObjectMutationVariables = {
  container: string;
  key: string;
  value: string;
};

export const useCustomObjectSetter: TUseCustomObjectSetter = (
  container,
  key
) => {
  const [setValueMutation, { error, loading }] = useMcMutation<
    TFetchCustomObjectQuery,
    TSetCustomObjectMutationVariables
  >(SetCustomObjectMutation, {
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const setValue = useCallback(
    async (value: string | null) => {
      if (!value) {
        // If value is null, skip the operation
        console.log(`${key} cleared (no deletion)`);
        return;
      }

      try {
        await setValueMutation({
          variables: {
            container,
            key,
            value,
          },
        });

        console.log(`${key} saved to custom object`);
      } catch (err) {
        console.error(`Failed to save ${key} to custom object:`, err);
        throw err;
      }
    },
    [setValueMutation, container, key]
  );

  return {
    setValue,
    error,
    loading,
  };
};

// Generic hook to fetch custom object value
type TUseCustomObjectFetcher = (
  container: string,
  key: string
) => {
  value?: any;
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

export const useCustomObjectFetcher: TUseCustomObjectFetcher = (
  container,
  key
) => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchCustomObjectQuery,
    TFetchCustomObjectQueryVariables
  >(FetchCustomObjectQuery, {
    variables: {
      container,
      key,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  // Parse the value from the custom object
  let value: string | undefined;

  if (data?.customObject?.value) {
    value = data.customObject.value;
  }

  return {
    value,
    error,
    loading,
    refetch,
  };
};
