import type { ReactElement } from 'react';
import { NimbusProvider } from '@commercetools/nimbus';
import { createApolloClient } from '@commercetools-frontend/application-shell';
import {
  renderApp,
  renderAppWithRedux,
  type TRenderAppOptions,
  type TRenderAppWithReduxOptions,
} from '@commercetools-frontend/application-shell/test-utils';
import ApplicationRoutes from '../routes';
import { entryPointUriPath } from '../constants';

// NimbusProvider renders a colour-mode <script> (next-themes) that React 19 reports through console.error.
// The preset fails tests on console errors, so drop exactly that message and pass everything else through.
const ignoreNimbusScriptWarning = () => {
  const current = console.error as typeof console.error & {
    __nimbus?: boolean;
  };
  if (current.__nimbus) return;
  const wrapped = ((...args: unknown[]) => {
    if (String(args[0]).includes('Encountered a script tag while rendering'))
      return;
    current(...args);
  }) as typeof console.error & { __nimbus?: boolean };
  wrapped.__nimbus = true;
  console.error = wrapped;
};

const mergeWithDefaultOptions = (
  options: Partial<TRenderAppOptions> | Partial<TRenderAppWithReduxOptions> = {}
): Partial<TRenderAppOptions> | Partial<TRenderAppWithReduxOptions> => ({
  ...options,
  environment: {
    serviceUrl: 'https://svc.example/service',
    ...(options.environment || {}),
    entryPointUriPath,
  },
  apolloClient: createApolloClient(),
});

const renderApplication = (
  ui: ReactElement,
  options: Partial<TRenderAppOptions>
) => {
  ignoreNimbusScriptWarning();
  return renderApp(
    <NimbusProvider loadFonts={false}>{ui}</NimbusProvider>,
    mergeWithDefaultOptions(options)
  );
};

const renderApplicationWithRedux = (
  ui: ReactElement,
  options: Partial<TRenderAppWithReduxOptions>
) => {
  ignoreNimbusScriptWarning();
  return renderAppWithRedux(
    <NimbusProvider loadFonts={false}>{ui}</NimbusProvider>,
    mergeWithDefaultOptions(options)
  );
};

const renderApplicationWithRoutes = (options: Partial<TRenderAppOptions>) =>
  renderApplication(<ApplicationRoutes />, options);

const renderApplicationWithRoutesAndRedux = (
  options: Partial<TRenderAppWithReduxOptions>
) => renderApplicationWithRedux(<ApplicationRoutes />, options);

export {
  renderApplication,
  renderApplicationWithRedux,
  renderApplicationWithRoutes,
  renderApplicationWithRoutesAndRedux,
};
