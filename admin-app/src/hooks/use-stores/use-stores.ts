import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchStoresQuery from './fetch-stores.ctp.graphql';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';

type TFetchStoresQuery = {
  stores?: {
    results: Array<{
      key: string;
      name?: string | null;
    }>;
  };
};

type TFetchStoresQueryVariables = {
  limit?: number;
  language?: string;
};

export type StoreOption = {
  key: string;
  name: string;
};

type TUseStores = () => {
  stores: StoreOption[];
  loading: boolean;
  error?: ApolloError;
};

const DEFAULT_LIMIT = 500;

export const useStores: TUseStores = () => {
  const { dataLocale: language } = useApplicationContext<{
    language?: string;
  }>();
  const { data, error, loading } = useMcQuery<
    TFetchStoresQuery,
    TFetchStoresQueryVariables
  >(FetchStoresQuery, {
    variables: {
      limit: DEFAULT_LIMIT,
      language: language ?? undefined,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const stores: StoreOption[] =
    data?.stores?.results?.map((s) => ({
      key: s.key,
      name: s.name ?? s.key,
    })) ?? [];

  return {
    stores,
    loading,
    error,
  };
};
