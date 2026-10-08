/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

export const entryPointUriPath = 'multitenant-contentools-wrapper';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);

/** Contentools: custom object container and keys (align with router constants) */
export const CONFIGURATION_CONTAINER = 'contentools-configuration';
export const JWT_TOKEN_KEY = 'contentools-jwt-token';
export const CREDENTIALS_KEY = 'contentools-credentials';
