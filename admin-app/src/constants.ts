/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

// window.app is set by the Merchant Center shell at runtime; ENTRY_POINT_URI_PATH covers SSR/tests.
const runtimePath =
  typeof window === 'undefined'
    ? undefined
    : (window as { app?: { entryPointUriPath?: string } }).app
        ?.entryPointUriPath;

export const entryPointUriPath: string =
  runtimePath ?? process.env['ENTRY_POINT_URI_PATH'] ?? 'contentools';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
