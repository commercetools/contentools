import React from 'react';
import { Render } from '@measured/puck';
import type { Config, Data } from '@measured/puck';
import type { PuckData, PuckConfig } from '@commercetools-demo/puck-types';
import { defaultRenderConfig } from '@commercetools-demo/puck-components';
import { EnsureIntlProvider } from './EnsureIntlProvider';

export interface PuckDataRendererProps {
  /** The Puck Data to render (from the API or SSR props). */
  data: PuckData;
  /**
   * The Puck Config that defines available components and their render functions.
   * Defaults to the built-in Nimbus-free render config, which matches the
   * editor's default components. Pass your own only if you extended the config.
   */
  config?: PuckConfig;
  /**
   * Content locale (e.g. "en-US"), used to resolve the rendered components'
   * react-intl messages. Only `en`/`es` are shipped; unsupported locales fall
   * back to English. Defaults to English.
   */
  locale?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SSR-friendly renderer — no data fetching, renders whatever Data you pass in.
 * Wrap with PuckApiProvider only if the config's components use API hooks.
 *
 * The rendered components require a react-intl context; this component supplies
 * one via {@link EnsureIntlProvider} so it works standalone in a storefront.
 */
export const PuckDataRenderer: React.FC<PuckDataRendererProps> = ({
  data,
  config = defaultRenderConfig as PuckConfig,
  locale,
  className,
  style,
}) => {
  return (
    <EnsureIntlProvider locale={locale}>
      <div className={className} style={style}>
        <Render config={config as Config} data={data as Data} />
      </div>
    </EnsureIntlProvider>
  );
};
