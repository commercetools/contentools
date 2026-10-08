import { useState } from 'react';
import type { ApolloError } from '@apollo/client';
import { useMcMutation } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import CreateApiClientMutation from './create-api-client.ctp.graphql';

type TCreateApiClientMutation = {
  createApiClient?: {
    id: string;
    secret: string;
    name: string;
    scope: string;
    accessTokenValiditySeconds?: number;
    deleteAt?: string;
    createdAt?: string;
  };
};

type TCreateApiClientMutationVariables = {
  draft: {
    name: string;
    scope: string;
    accessTokenValiditySeconds?: number;
    deleteDaysAfterCreation?: number;
    refreshTokenValiditySeconds?: number;
  };
};

type TCreateApiClientResult = {
  clientId: string;
  clientSecret: string;
  name: string;
  scope: string;
  accessTokenValiditySeconds?: number;
  deleteAt?: string;
  createdAt?: string;
};

type TUseCreateApiClient = (projectKey: string) => {
  createApiClient: () => Promise<TCreateApiClientResult>;
  loading: boolean;
  error?: ApolloError;
};

export const useCreateApiClient: TUseCreateApiClient = (projectKey: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApolloError | undefined>(undefined);

  const [mutate] = useMcMutation<
    TCreateApiClientMutation,
    TCreateApiClientMutationVariables
  >(CreateApiClientMutation, {
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const createApiClient = async (): Promise<TCreateApiClientResult> => {
    setLoading(true);
    setError(undefined);

    try {
      const { data, errors } = await mutate({
        variables: {
          draft: {
            name: `Chat authentication API client`,
            scope: `manage_project:${projectKey} view_checkout_applications:${projectKey}`,
          },
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      if (!data?.createApiClient) {
        throw new Error('Failed to create API client');
      }

      return {
        clientId: data.createApiClient.id,
        clientSecret: data.createApiClient.secret,
        name: data.createApiClient.name,
        scope: data.createApiClient.scope,
        accessTokenValiditySeconds:
          data.createApiClient.accessTokenValiditySeconds,
        deleteAt: data.createApiClient.deleteAt,
        createdAt: data.createApiClient.createdAt,
      };
    } catch (err) {
      const apolloError = err as ApolloError;
      setError(apolloError);
      throw apolloError;
    } finally {
      setLoading(false);
    }
  };

  return {
    createApiClient,
    loading,
    error,
  };
};
