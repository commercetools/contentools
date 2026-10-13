/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import React from 'react';
import { Render } from '@measured/puck';
import type { Config, Data } from '@measured/puck';
import type { PuckData, PuckConfig } from '@commercetools-labs/contentools-types';
import { defaultRenderConfig } from '@commercetools-labs/contentools-components';
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
   * react-intl messages. Only `en`, `es` and `de` are shipped; unsupported locales fall
   * back to English. Defaults to English.
   */
  locale?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SSR-friendly renderer — no data fetching, renders whatever Data you pass in.
 * Works without any provider; product blocks use their embedded `resolvedData`
 * or the optional ancestor PuckApiProvider.
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
