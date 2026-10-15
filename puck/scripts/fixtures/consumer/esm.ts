// Type-resolution fixture: imports one symbol from each published package
// through its public entry, the way an ESM consumer would.
import type { PuckData } from '@commercetools-labs/contentools-types';
import { PuckApiProvider } from '@commercetools-labs/contentools-api';
import { sanitizeHtml } from '@commercetools-labs/contentools-components';
import { useVersionDiff } from '@commercetools-labs/contentools-version-history';
import { ImagePickerField } from '@commercetools-labs/contentools-image-picker';
import { ThemeManager } from '@commercetools-labs/contentools-theme-manager';
import { PuckEditor } from '@commercetools-labs/contentools-editor';
import { PuckRenderer } from '@commercetools-labs/contentools-renderer';
import { PageManager } from '@commercetools-labs/contentools-page-manager';
import { ContentEditor } from '@commercetools-labs/contentools-content-manager';

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
