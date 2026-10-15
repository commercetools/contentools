/** Name of every raw API function; the request pipeline looks the auth policy up by this name. */
export type PuckOp =
  | 'listPuckPagesApi'
  | 'getPuckPageApi'
  | 'createPuckPageApi'
  | 'updatePuckPageApi'
  | 'deletePuckPageApi'
  | 'getPublishedPuckPageApi'
  | 'getPreviewPuckPageApi'
  | 'queryPuckPageApi'
  | 'getPuckPageStatesApi'
  | 'publishPuckPageApi'
  | 'revertPuckPageDraftApi'
  | 'getPuckPageVersionsApi'
  | 'listPuckContentsApi'
  | 'getPuckContentApi'
  | 'createPuckContentApi'
  | 'updatePuckContentApi'
  | 'deletePuckContentApi'
  | 'getPublishedPuckContentApi'
  | 'getPreviewPuckContentApi'
  | 'queryPuckContentApi'
  | 'getPuckContentStatesApi'
  | 'publishPuckContentApi'
  | 'revertPuckContentDraftApi'
  | 'getPuckContentVersionsApi'
  | 'listPuckTemplatesApi'
  | 'createPuckTemplateApi'
  | 'deletePuckTemplateApi'
  | 'getThemeApi'
  | 'createThemeApi'
  | 'updateThemeApi'
  | 'importDefaultContentTypesApi'
  | 'fetchMediaLibraryApi'
  | 'uploadMediaFileApi'
  | 'searchProductsApi'
  | 'resolveDatasourceApi';

export type PuckRequestMode = 'published' | 'preview';

/**
 * `public`: never requires auth (auth is still attached when available).
 * `protected`: requires an auth source on the client; fails before any I/O otherwise.
 * `attach`: no client side requirement, auth is attached when available and the server decides.
 * A function picks the level from the request mode.
 */
export type PuckPolicyValue =
  | 'public'
  | 'protected'
  | 'attach'
  | ((mode: PuckRequestMode) => 'public' | 'protected');

/** Which calls need authentication. Mirrors the service: published reads and configuration reads are public. */
export const PUCK_AUTH_POLICY: Record<PuckOp, PuckPolicyValue> = {
  // public: published reads and configuration reads
  getPublishedPuckPageApi: 'public',
  getPublishedPuckContentApi: 'public',
  getThemeApi: 'public',
  queryPuckPageApi: (mode) => (mode === 'preview' ? 'protected' : 'public'),
  queryPuckContentApi: (mode) => (mode === 'preview' ? 'protected' : 'public'),

  // the service decides (flag PUBLIC_DATASOURCE_RESOLVE)
  resolveDatasourceApi: 'attach',

  // protected: preview reads, lists, reads with states, mutations, versions, templates, media, import, search
  listPuckPagesApi: 'protected',
  getPuckPageApi: 'protected',
  createPuckPageApi: 'protected',
  updatePuckPageApi: 'protected',
  deletePuckPageApi: 'protected',
  getPreviewPuckPageApi: 'protected',
  getPuckPageStatesApi: 'protected',
  publishPuckPageApi: 'protected',
  revertPuckPageDraftApi: 'protected',
  getPuckPageVersionsApi: 'protected',
  listPuckContentsApi: 'protected',
  getPuckContentApi: 'protected',
  createPuckContentApi: 'protected',
  updatePuckContentApi: 'protected',
  deletePuckContentApi: 'protected',
  getPreviewPuckContentApi: 'protected',
  getPuckContentStatesApi: 'protected',
  publishPuckContentApi: 'protected',
  revertPuckContentDraftApi: 'protected',
  getPuckContentVersionsApi: 'protected',
  listPuckTemplatesApi: 'protected',
  createPuckTemplateApi: 'protected',
  deletePuckTemplateApi: 'protected',
  createThemeApi: 'protected',
  updateThemeApi: 'protected',
  importDefaultContentTypesApi: 'protected',
  fetchMediaLibraryApi: 'protected',
  uploadMediaFileApi: 'protected',
  searchProductsApi: 'protected',
};
