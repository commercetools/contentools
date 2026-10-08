// Context & Provider
export { PuckApiContext, usePuckApiContext } from './context/PuckApiContext';
export { PuckApiProvider } from './context/PuckApiProvider';
export type { PuckApiProviderProps } from './context/PuckApiProvider';
export type { PuckApiContextValue } from './context/PuckApiContext';

// Media library API
export {
  fetchMediaLibraryApi,
  uploadMediaFileApi,
} from './api/media-library.api';

export { useMediaLibrary } from './hooks/useMediaLibrary';
export type { UseMediaLibraryReturn } from './hooks/useMediaLibrary';

// Raw API functions (pages)
export {
  listPuckPagesApi,
  getPuckPageApi,
  createPuckPageApi,
  updatePuckPageApi,
  deletePuckPageApi,
  getPublishedPuckPageApi,
  getPreviewPuckPageApi,
  queryPuckPageApi,
} from './api/puck-pages.api';

export {
  getPuckPageStatesApi,
  publishPuckPageApi,
  revertPuckPageDraftApi,
  getPuckPageVersionsApi,
} from './api/puck-states.api';

// Raw API functions (contents)
export {
  listPuckContentsApi,
  getPuckContentApi,
  createPuckContentApi,
  updatePuckContentApi,
  deletePuckContentApi,
  getPublishedPuckContentApi,
  getPreviewPuckContentApi,
  queryPuckContentApi,
} from './api/puck-contents.api';

export {
  getPuckContentStatesApi,
  publishPuckContentApi,
  revertPuckContentDraftApi,
  getPuckContentVersionsApi,
} from './api/puck-content-states.api';

// Raw API functions (templates)
export {
  listPuckTemplatesApi,
  createPuckTemplateApi,
  deletePuckTemplateApi,
} from './api/puck-templates.api';

// Hooks (pages)
export { usePuckPages } from './hooks/usePuckPages';
export type { UsePuckPagesReturn } from './hooks/usePuckPages';

export { usePuckPage } from './hooks/usePuckPage';
export type { UsePuckPageReturn } from './hooks/usePuckPage';

export { usePuckStateManagement } from './hooks/usePuckStateManagement';
export type { UsePuckStateManagementReturn } from './hooks/usePuckStateManagement';

// Hooks (contents)
export { usePuckContents } from './hooks/usePuckContents';
export type { UsePuckContentsReturn } from './hooks/usePuckContents';

export { usePuckContent } from './hooks/usePuckContent';
export type { UsePuckContentReturn } from './hooks/usePuckContent';

// Hooks (templates)
export { usePuckTemplates } from './hooks/usePuckTemplates';
export type { UsePuckTemplatesReturn } from './hooks/usePuckTemplates';

// Datasource API & hook
export { resolveDatasourceApi } from './api/datasource.api';
export { useDatasource } from './hooks/useDatasource';
export type { UseDatasourceReturn } from './hooks/useDatasource';

// Product search API & hook (task #4)
export { searchProductsApi } from './api/products.api';
export type { ProductSearchResult } from './api/products.api';
export { useProductSearch } from './hooks/useProductSearch';
export type { UseProductSearchReturn } from './hooks/useProductSearch';

// Configuration API & hooks
export {
  getThemeApi,
  createThemeApi,
  updateThemeApi,
  importDefaultContentTypesApi,
} from './api/configuration.api';

export { usePuckConfiguration } from './hooks/usePuckConfiguration';
export type { UsePuckConfigurationReturn } from './hooks/usePuckConfiguration';

export { usePuckContentType } from './hooks/usePuckContentType';
export type { UsePuckContentTypeReturn } from './hooks/usePuckContentType';
