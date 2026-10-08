// Main editor component
export { PuckEditor } from './PuckEditor';
export type { PuckEditorProps } from './PuckEditor';

// Default config: build a localized one with createDefaultPuckConfig(intl).
// `defaultPuckConfig` is a deprecated English-only const kept for back-compat.
export { createDefaultPuckConfig, defaultPuckConfig } from './config/defaultPuckConfig';

// Built-in component config factories (compose custom configs with these)
export {
  createHeroConfig,
  createRichTextConfig,
  createGridConfig,
  createColumnsConfig,
  createImageConfig,
  createButtonConfig,
  createCardConfig,
  createSpacerConfig,
  createProductTeaserConfig,
} from './components';
export type {
  HeroProps,
  RichTextProps,
  GridProps,
  ColumnsProps,
  ImageProps,
  ButtonProps,
  CardProps,
  SpacerProps,
  ProductTeaserProps,
} from './components';

// Custom field components (reuse in your own component configs)
export { ImagePickerField } from './fields/ImagePickerField';
export type { ImagePickerFieldProps } from './fields/ImagePickerField';

export { DatasourceField } from './fields/DatasourceField';
export type { DatasourceFieldProps, DatasourceValue, DatasourceType } from './fields/DatasourceField';

export { RichTextField, richTextField } from './fields/RichTextField';
export type { RichTextFieldProps } from './fields/RichTextField';

export { sanitizeHtml } from '@commercetools-demo/puck-components';

// CMS components
export * from './components/cms';

// Toolbar (in case consumers want to render it standalone)
export { EditorToolbar } from './toolbar/EditorToolbar';
export type { EditorToolbarProps } from './toolbar/EditorToolbar';

// Unsaved-changes navigation guard dialog (Nimbus)
export { UnsavedChangesDialog } from './toolbar/UnsavedChangesDialog';
export type { UnsavedChangesDialogProps } from './toolbar/UnsavedChangesDialog';

// Create-template dialog (Nimbus) + "without data" stripping util
export { CreateTemplateDialog } from './toolbar/CreateTemplateDialog';
export type { CreateTemplateDialogProps } from './toolbar/CreateTemplateDialog';
export { stripPuckDataToTemplate } from './utils/stripTemplateData';

// Dirty-state tracking hook (skips Puck's normalising mount onChange)
export { useDirtyState } from './hooks/useDirtyState';
export type { DirtyState } from './hooks/useDirtyState';

// Puck overrides — component search panel and filter (reusable in any Puck editor)
export {
  ComponentSearchProvider,
  ComponentsPanel,
  ComponentItemFilter,
} from './overrides/ComponentListSearch';

// Nimbus-styled field-type overrides (text/textarea/select/radio inputs)
export { nimbusFieldTypes } from './overrides/NimbusFieldTypes';

// Draggable resize handles for the sidebars (left components / right properties)
export { PanelResizer } from './overrides/PanelResizer';
export type { PanelResizerProps, ResizerSide } from './overrides/PanelResizer';
export { PropertiesResizer } from './overrides/PropertiesResizer';
export type { PropertiesResizerProps } from './overrides/PropertiesResizer';
export { ComponentsResizer } from './overrides/ComponentsResizer';
export type { ComponentsResizerProps } from './overrides/ComponentsResizer';

// i18n message catalogs (merge into a host IntlProvider to translate editor UI)
export { intlCatalogs } from '@commercetools-demo/puck-components';
