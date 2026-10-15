import React, { useEffect, useState, type ReactElement } from 'react';
import {
  PuckApiProvider,
  usePuckApiContext,
  usePuckApiContextOptional,
} from '@commercetools-labs/contentools-api';
import { defaultRenderConfig } from '@commercetools-labs/contentools-components';
import type {
  PuckConfig,
  PuckConnection,
  PuckData,
} from '@commercetools-labs/contentools-types';
import { loadPuckData } from './loadPuckData';
import { PuckDataRenderer } from './PuckDataRenderer';

const DEFAULT_CONFIG: PuckConfig = {
  ...defaultRenderConfig,
  components: { ...defaultRenderConfig.components },
} as PuckConfig;

// ---------------------------------------------------------------------------
// Inner component (needs PuckApiContext)
// ---------------------------------------------------------------------------

interface PuckRendererInnerProps {
  type: 'page' | 'content';
  pageKey?: string;
  slug?: string;
  contentKey?: string;
  query?: string;
  mode: 'published' | 'preview';
  config: PuckConfig;
  locale?: string;
  loadingComponent?: ReactElement;
  errorComponent?: ReactElement;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PuckRendererInner: React.FC<PuckRendererInnerProps> = ({
  type,
  pageKey,
  slug,
  contentKey,
  query,
  mode,
  config,
  locale,
  loadingComponent,
  errorComponent,
  children,
  className,
  style,
}) => {
  const { client, baseURL, businessUnitKey } = usePuckApiContext();

  const [data, setData] = useState<PuckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (mode === 'preview' && !client.canAuthenticate) {
        setError('Preview requires authentication');
        setLoading(false);
        return;
      }

      try {
        const puckData = await loadPuckData(client, {
          type,
          pageKey,
          slug,
          contentKey,
          query,
          mode,
        });
        if (!cancelled) {
          if (puckData) {
            setData(puckData);
          } else {
            setError(type === 'content' ? 'Content not found' : 'Page not found');
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [client, baseURL, businessUnitKey, type, pageKey, slug, contentKey, query, mode]);

  if (loading) {
    return (
      loadingComponent ?? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px',
            color: '#6b7280',
          }}
        >
          Loading…
        </div>
      )
    );
  }

  if (error || !data) {
    return (
      <>
        {errorComponent ?? children ?? (
          <div
            style={{
              padding: '32px',
              color: '#dc2626',
              background: '#fef2f2',
              borderRadius: '8px',
            }}
          >
            {error ?? 'Failed to load'}
          </div>
        )}
      </>
    );
  }

  return (
    <PuckDataRenderer
      data={data}
      config={config}
      locale={locale}
      className={className}
      style={style}
    />
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface PuckRendererProps extends Partial<PuckConnection> {
  /**
   * Whether to render a page or a content item. Defaults to 'page'.
   * - 'page': use pageKey or slug to fetch
   * - 'content': use contentKey or query (contentType) to fetch
   */
  type?: 'page' | 'content';

  /**
   * Connection props (`baseURL`, `businessUnitKey`, optional `jwtToken`, `getAuthHeaders`,
   * `fetcher`). Published content needs no auth. Can be omitted when a PuckApiProvider is
   * already in the tree.
   */

  /** [type=page] Fetch by page key. */
  pageKey?: string;
  /** [type=page] OR fetch by slug (URL path). */
  slug?: string;

  /** [type=content] Fetch by content key. */
  contentKey?: string;
  /** [type=content] OR fetch by contentType query string. */
  query?: string;

  /** 'published' (default) or 'preview' (draft || published). */
  mode?: 'published' | 'preview';

  /**
   * Puck config — must match the config used in the editor. Defaults to the
   * built-in Nimbus-free render config.
   */
  config?: PuckConfig;

  /**
   * Content locale (e.g. "en-US") used to resolve the rendered components'
   * react-intl messages. Only `en`, `es` and `de` are shipped; unsupported locales fall
   * back to English. Defaults to English.
   */
  locale?: string;

  /** Custom loading indicator. */
  loadingComponent?: ReactElement;
  /** Custom error display. */
  errorComponent?: ReactElement;

  /**
   * Fallback content rendered when there is nothing to show — fetch error,
   * not-found, or no identifying param (pageKey/slug/contentKey/query) given.
   * Not used while loading. If `errorComponent` is provided it takes precedence
   * over `children`.
   */
  children?: React.ReactNode;

  className?: string;
  style?: React.CSSProperties;
}

export const PuckRenderer: React.FC<PuckRendererProps> = ({
  type = 'page',
  baseURL,
  businessUnitKey,
  jwtToken,
  getAuthHeaders,
  fetcher,
  publicDatasourceResolve,
  pageKey,
  slug,
  contentKey,
  query,
  mode = 'published',
  config = DEFAULT_CONFIG,
  locale,
  loadingComponent,
  errorComponent,
  children,
  className,
  style,
}) => {
  const ancestor = usePuckApiContextOptional();
  const ownConnection = Boolean(baseURL && businessUnitKey);

  if (!ownConnection && !ancestor) {
    return (
      errorComponent ?? (
        <div
          style={{
            padding: '32px',
            color: '#dc2626',
            background: '#fef2f2',
            borderRadius: '8px',
          }}
        >
          PuckRenderer needs baseURL and businessUnitKey or a PuckApiProvider
        </div>
      )
    );
  }

  const inner = (
    <PuckRendererInner
      type={type}
      pageKey={pageKey}
      slug={slug}
      contentKey={contentKey}
      query={query}
      mode={mode}
      config={config}
      locale={locale}
      loadingComponent={loadingComponent}
      errorComponent={errorComponent}
      className={className}
      style={style}
    >
      {children}
    </PuckRendererInner>
  );

  if (ownConnection && baseURL && businessUnitKey) {
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
        {inner}
      </PuckApiProvider>
    );
  }

  return inner;
};
