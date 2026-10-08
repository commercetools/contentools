/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import React, { type ReactNode } from 'react';
import { PuckApiContext, type PuckApiContextValue } from './PuckApiContext';

export interface PuckApiProviderProps extends PuckApiContextValue {
  children: ReactNode;
}

export const PuckApiProvider: React.FC<PuckApiProviderProps> = ({
  children,
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
}) => {
  return (
    <PuckApiContext.Provider
      value={{ baseURL, projectKey, businessUnitKey, jwtToken, locale }}
    >
      {children}
    </PuckApiContext.Provider>
  );
};
