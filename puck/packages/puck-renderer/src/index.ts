export { PuckDataRenderer } from './PuckDataRenderer';
export type { PuckDataRendererProps } from './PuckDataRenderer';

export { PuckRenderer } from './PuckRenderer';
export type { PuckRendererProps } from './PuckRenderer';

export { EnsureIntlProvider, resolveLang } from './EnsureIntlProvider';
export type { EnsureIntlProviderProps } from './EnsureIntlProvider';

// Nimbus-free render config + i18n catalogs, re-exported so consumers get
// everything from this single package and never import the Nimbus-based editor.
export {
  defaultRenderConfig,
  createRenderConfig,
  intlCatalogs,
} from '@commercetools-demo/puck-components';
