/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { bu, businessUnitKey } from '../schemas';
import { defineTool } from '../types';

export const contentTypesTools = [
  defineTool({
    name: 'import_default_content_types',
    title: 'Import default content types',
    group: 'content-types',
    access: 'write',
    description:
      'Import the default set of content types (about 27 sample types) into the project. WRITES data; safe to repeat.',
    shape: { businessUnitKey },
    request: (i, c) => ({
      method: 'POST',
      path: `${bu(i, c.defaultBusinessUnitKey)}/content-type/import`,
      body: {},
    }),
  }),
];
