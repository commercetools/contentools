/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createContext, useContext } from 'react';

export interface PuckApiContextValue {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken?: string;
  /**
   * Content locale (e.g. "en-US", "de-DE") used for locale-aware API calls
   * such as product search. Defaults to "en-US" downstream when unset.
   */
  locale?: string;
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
