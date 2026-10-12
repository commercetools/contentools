/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createContext, useContext } from 'react';
import type { PuckConnection } from '@commercetools-labs/contentools-types';
import type { PuckClient } from '../client/client';

export interface PuckApiContextValue {
  /** The shared request pipeline; its identity is stable for the lifetime of the provider. */
  client: PuckClient;
  baseURL: string;
  businessUnitKey: string;
  /**
   * Content locale (e.g. "en-US", "de-DE") used for locale-aware API calls
   * such as product search. Defaults to "en-US" downstream when unset.
   */
  locale?: string;
  /** True when a token, auth-header provider or fetcher is configured. */
  canAuthenticate: boolean;
  /** The original connection props, used to re-mount nested providers. */
  connection: PuckConnection;
}

export const PuckApiContext = createContext<PuckApiContextValue | null>(null);

export const usePuckApiContext = (): PuckApiContextValue => {
  const ctx = useContext(PuckApiContext);
  if (!ctx) {
    throw new Error(
      'usePuckApiContext must be used inside <PuckApiProvider>. ' +
        'Wrap your component tree with <PuckApiProvider>.'
    );
  }
  return ctx;
};

/** Like `usePuckApiContext` but returns `null` outside a provider instead of throwing. */
export const usePuckApiContextOptional = (): PuckApiContextValue | null =>
  useContext(PuckApiContext);

export const usePuckClient = (): PuckClient => usePuckApiContext().client;
