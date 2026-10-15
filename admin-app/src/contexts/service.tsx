import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import {
  createDirectFetch,
  forwardToFetch,
  type ServiceFetcher,
} from '../hooks/use-service-fetcher';
import ServiceNotConfigured from '../components/service-not-configured';

type ServiceValue = { serviceUrl: string; fetcher: ServiceFetcher };
const ServiceContext = createContext<ServiceValue | undefined>(undefined);

// export const normalizeServiceUrl = (raw: unknown): string | null => {
//   if (typeof raw !== 'string') return null;
//   const url = raw.trim().replace(/\/+$/, '');
//   return /^https:\/\/[^\s/]+(\/.*)?$/.test(url) ? url : null;
// };

// The forward-to proxy only reaches public https URLs, so a local service is called directly.
const LOCAL_SERVICE_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;
export const isLocalServiceUrl = (url: string): boolean =>
  LOCAL_SERVICE_URL.test(url.trim());

export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const env = useApplicationContext(
    (ctx) =>
      ctx.environment as { serviceUrl?: string; devServiceToken?: string }
  );
  // const serviceUrl = normalizeServiceUrl(raw);
  const serviceUrl = env.serviceUrl;
  const devServiceToken = env.devServiceToken;
  const value = useMemo(() => {
    if (!serviceUrl) return undefined;
    const fetcher = isLocalServiceUrl(serviceUrl)
      ? createDirectFetch(devServiceToken || undefined)
      : forwardToFetch;
    return { serviceUrl, fetcher };
  }, [serviceUrl, devServiceToken]);
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
