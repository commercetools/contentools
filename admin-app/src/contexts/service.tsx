/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import {
  forwardToFetch,
  type ServiceFetcher,
} from '../hooks/use-service-fetcher';
import ServiceNotConfigured from '../components/service-not-configured';

type ServiceValue = { serviceUrl: string; fetcher: ServiceFetcher };
const ServiceContext = createContext<ServiceValue | undefined>(undefined);


export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const raw = useApplicationContext(
    (ctx) => (ctx.environment as { serviceUrl?: string }).serviceUrl
  );
  const serviceUrl = raw;
  const value = useMemo(
    () => (serviceUrl ? { serviceUrl, fetcher: forwardToFetch } : undefined),
    [serviceUrl]
  );
  if (!value) return <ServiceNotConfigured />;
  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
};

export const useService = (): ServiceValue => {
  const v = useContext(ServiceContext);
  if (!v) throw new Error('useService must be used within a ServiceProvider');
  return v;
};
