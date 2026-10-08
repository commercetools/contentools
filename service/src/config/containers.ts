/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

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
