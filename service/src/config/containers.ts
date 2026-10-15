export const CONTAINER_NAMES = {
  puckPage: 'puck-page',
  puckPageState: 'puck-page-state',
  puckPageVersion: 'puck-page-version',
  puckContent: 'puck-content',
  puckContentState: 'puck-content-state',
  puckContentVersion: 'puck-content-version',
  puckTemplate: 'puck-template',
  configuration: 'configuration',
  contentType: 'content-type',
  datasource: 'datasource',
} as const;

export type ContainerKey = keyof typeof CONTAINER_NAMES;

export const containerName = (prefix: string, key: ContainerKey): string =>
  `${prefix}${CONTAINER_NAMES[key]}`;
