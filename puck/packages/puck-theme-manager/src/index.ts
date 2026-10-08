export { default as ThemeManager } from './components/theme-editor';
export type { ThemeManagerProps } from './components/theme-editor';

export { default as ImportContentTypes } from './components/import-content-types';
export type { ImportContentTypesProps } from './components/import-content-types';

export { DEFAULT_THEME } from './constants';
export {
  themePresets,
  paradigmLabels,
  PRESET_KEYS_SELECTOR,
  buildCssVars,
} from './presets';
export type { DesignParadigm } from './presets';

export type { ThemeTokens, ImportResult } from '@commercetools-demo/puck-types';

// Locale catalogs owned by this package (merged by the host app's intl provider)
export { catalogs as intlCatalogs } from './intl';
