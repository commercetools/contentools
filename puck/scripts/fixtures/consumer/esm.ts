/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Type-resolution fixture: imports one symbol from each published package
// through its public entry, the way an ESM consumer would.
import type { PuckData } from '@commercetools-labs/puck-types';
import { PuckApiProvider } from '@commercetools-labs/puck-api';
import { sanitizeHtml } from '@commercetools-labs/puck-components';
import { useVersionDiff } from '@commercetools-labs/puck-version-history';
import { ImagePickerField } from '@commercetools-labs/puck-image-picker';
import { ThemeManager } from '@commercetools-labs/puck-theme-manager';
import { PuckEditor } from '@commercetools-labs/puck-editor';
import { PuckRenderer } from '@commercetools-labs/puck-renderer';
import { PageManager } from '@commercetools-labs/puck-page-manager';
import { ContentEditor } from '@commercetools-labs/puck-content-manager';

export const used: [
  PuckData | undefined,
  typeof PuckApiProvider,
  typeof sanitizeHtml,
  typeof useVersionDiff,
  typeof ImagePickerField,
  typeof ThemeManager,
  typeof PuckEditor,
  typeof PuckRenderer,
  typeof PageManager,
  typeof ContentEditor,
] = [
  undefined,
  PuckApiProvider,
  sanitizeHtml,
  useVersionDiff,
  ImagePickerField,
  ThemeManager,
  PuckEditor,
  PuckRenderer,
  PageManager,
  ContentEditor,
];
