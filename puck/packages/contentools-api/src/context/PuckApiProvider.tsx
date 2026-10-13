/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import React, {
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PuckConnection } from '@commercetools-labs/contentools-types';
import { createPuckClient, updatePuckClient } from '../client/client';
import { PuckApiContext, type PuckApiContextValue } from './PuckApiContext';

export interface PuckApiProviderProps extends PuckConnection {
  children: ReactNode;
}

const connectionKeys = [
  'baseURL',
  'businessUnitKey',
  'locale',
  'jwtToken',
  'getAuthHeaders',
  'fetcher',
  'publicDatasourceResolve',
] as const;

const sameConnection = (a: PuckConnection, b: PuckConnection): boolean =>
  connectionKeys.every((key) => a[key] === b[key]);

export const PuckApiProvider: React.FC<PuckApiProviderProps> = ({
  children,
  baseURL,
  businessUnitKey,
  locale,
  jwtToken,
  getAuthHeaders,
  fetcher,
  publicDatasourceResolve,
}) => {
  const ancestor = useContext(PuckApiContext);

  const connection = useMemo<PuckConnection>(
    () => ({
      baseURL,
      businessUnitKey,
      locale,
      jwtToken,
      getAuthHeaders,
      fetcher,
      publicDatasourceResolve,
    }),
    [
      baseURL,
      businessUnitKey,
      locale,
      jwtToken,
      getAuthHeaders,
      fetcher,
      publicDatasourceResolve,
    ]
  );

  // One client per provider; props are pushed into it so identity stays stable
  // and a rotated token applies to the next request without a remount.
  const [client] = useState(() => createPuckClient(connection));
  useLayoutEffect(() => {
    updatePuckClient(client, connection);
  }, [client, connection]);

  const value = useMemo<PuckApiContextValue>(
    () => ({
      client,
      baseURL,
      businessUnitKey,
      locale,
      canAuthenticate: Boolean(jwtToken || getAuthHeaders || fetcher),
      connection,
    }),
    [
      client,
      baseURL,
      businessUnitKey,
      locale,
      jwtToken,
      getAuthHeaders,
      fetcher,
      connection,
    ]
  );

  // A nested provider with identical props reuses the ancestor's client.
  if (ancestor && sameConnection(ancestor.connection, connection)) {
    return (
      <PuckApiContext.Provider value={ancestor}>
        {children}
      </PuckApiContext.Provider>
    );
  }

  return (
    <PuckApiContext.Provider value={value}>{children}</PuckApiContext.Provider>
  );
};
