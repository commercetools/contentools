/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchProjectLanguagesQuery from './fetch-project-languages.ctp.graphql';

type TFetchProjectLanguagesQuery = {
  project?: {
    languages: string[];
  };
};

type TUseProjectLanguages = () => {
  languages: string[];
  loading: boolean;
  error?: ApolloError;
};

export const useProjectLanguages: TUseProjectLanguages = () => {
  const { data, error, loading } = useMcQuery<TFetchProjectLanguagesQuery>(
    FetchProjectLanguagesQuery,
    {
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
    }
  );

  const languages = data?.project?.languages ?? [];

  return {
    languages,
    loading,
    error,
  };
};
