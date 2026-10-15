/** The single list of container env vars and their suffixes. If a spec renames a container env var, update ONLY this file. */
export const CONTAINER_ENV: Record<string, string> = {
  PUCK_PAGE_CONTAINER: 'puck-page',
  PUCK_PAGE_STATE_CONTAINER: 'puck-page-state',
  PUCK_PAGE_VERSION_CONTAINER: 'puck-page-version',
  PUCK_CONTENT_CONTAINER: 'puck-content',
  PUCK_CONTENT_STATE_CONTAINER: 'puck-content-state',
  PUCK_CONTENT_VERSION_CONTAINER: 'puck-content-version',
  PUCK_TEMPLATE_CONTAINER: 'puck-template',
  CONFIGURATION_CONTAINER: 'configuration',
  CONTENT_TYPE_CONTAINER: 'content-type',
};

export const TEST_CONTAINER_PREFIX = 'contentools-test-';
