import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchBusinessUnitsQuery from './fetch-business-units.ctp.graphql';

type TFetchBusinessUnitsQuery = {
  businessUnits?: {
    results: Array<{
      key: string;
      name: string;
    }>;
  };
};

type TFetchBusinessUnitsQueryVariables = {
  limit?: number;
};

export type BusinessUnit = {
  key: string;
  name: string;
};

type TUseBusinessUnits = () => {
  businessUnits: BusinessUnit[];
  loading: boolean;
  error?: ApolloError;
};

const DEFAULT_LIMIT = 500;

export const useBusinessUnits: TUseBusinessUnits = () => {
  const { data, error, loading } = useMcQuery<
    TFetchBusinessUnitsQuery,
    TFetchBusinessUnitsQueryVariables
  >(FetchBusinessUnitsQuery, {
    variables: {
      limit: DEFAULT_LIMIT,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const businessUnits: BusinessUnit[] =
    data?.businessUnits?.results?.map((bu) => ({
      key: bu.key,
      name: bu.name,
    })) ?? [];

  return {
    businessUnits,
    loading,
    error,
  };
};
