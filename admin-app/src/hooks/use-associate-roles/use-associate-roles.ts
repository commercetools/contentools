import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchAssociateRolesQuery from './fetch-associate-roles.ctp.graphql';

type TFetchAssociateRolesQuery = {
  associateRoles?: {
    results: Array<{
      key: string;
      name?: string | null;
    }>;
  };
};

type TFetchAssociateRolesQueryVariables = {
  limit?: number;
};

export type AssociateRoleOption = {
  key: string;
  name: string;
};

type TUseAssociateRoles = () => {
  associateRoles: AssociateRoleOption[];
  loading: boolean;
  error?: ApolloError;
};

const DEFAULT_LIMIT = 500;

export const useAssociateRoles: TUseAssociateRoles = () => {
  const { data, error, loading } = useMcQuery<
    TFetchAssociateRolesQuery,
    TFetchAssociateRolesQueryVariables
  >(FetchAssociateRolesQuery, {
    variables: {
      limit: DEFAULT_LIMIT,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const associateRoles: AssociateRoleOption[] =
    data?.associateRoles?.results?.map((r) => ({
      key: r.key,
      name: r.name ?? r.key,
    })) ?? [];

  return {
    associateRoles,
    loading,
    error,
  };
};
