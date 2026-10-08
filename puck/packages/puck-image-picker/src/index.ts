/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export { ImagePickerField } from './ImagePickerField';
export type { ImagePickerFieldProps } from './ImagePickerField';

export { ImagePickerProvider } from './context/ImagePickerProvider';
export type { ImagePickerProviderProps } from './context/ImagePickerProvider';
export type { ImagePickerConfig } from './context/ImagePickerProvider';

export { useMediaLibrary } from '@commercetools-labs/puck-api';
export type { UseMediaLibraryReturn } from '@commercetools-labs/puck-api';

export type {
  MediaFile,
  MediaLibraryPagination,
  MediaLibraryResult,
} from '@commercetools-labs/puck-types';

// Locale catalogs owned by this package (merged by the host app's intl provider)
export { catalogs as intlCatalogs } from './intl';
