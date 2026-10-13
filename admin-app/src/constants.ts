/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

// The Merchant Center tooling replaces the ${env:...} placeholder with the ENTRY_POINT_URI_PATH value.
// eslint-disable-next-line no-template-curly-in-string
export const entryPointUriPath = '${env:ENTRY_POINT_URI_PATH}';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
