/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import React, { type ReactNode } from 'react';
import { PuckApiProvider } from '@commercetools-labs/puck-api';
import type { PuckConnection } from '@commercetools-labs/puck-types';
import { EnsureIntlProvider } from '../EnsureIntlProvider';

/** Connection to the service; identical to the one every other Puck package takes. */
export type ImagePickerConfig = PuckConnection;

export interface ImagePickerProviderProps extends PuckConnection {
  children: ReactNode;
  /** Per-key message overrides applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

export const ImagePickerProvider: React.FC<ImagePickerProviderProps> = ({
  children,
  baseURL,
  businessUnitKey,
  locale,
  jwtToken,
  getAuthHeaders,
  fetcher,
  publicDatasourceResolve,
  messageOverrides,
}) => {
  return (
    <PuckApiProvider
      baseURL={baseURL}
      businessUnitKey={businessUnitKey}
      locale={locale}
      jwtToken={jwtToken}
      getAuthHeaders={getAuthHeaders}
      fetcher={fetcher}
      publicDatasourceResolve={publicDatasourceResolve}
    >
      <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
        {children}
      </EnsureIntlProvider>
    </PuckApiProvider>
  );
};
