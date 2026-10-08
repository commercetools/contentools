/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { z } from 'zod';
import type { Tool } from '../../types/tools';

export const contentTypeTools: Tool[] = [
  {
    method: 'import_content_types',
    name: 'Import Default Content Types',
    description: 'Import default content types from samples. Requires JWT.',
    parameters: z.object({}),
    actions: { content_type: { create: true } },
  },
];
