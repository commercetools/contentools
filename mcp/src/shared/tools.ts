/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Tool } from '../types/tools';
import { configurationTools } from './configuration/tools';
import { contentTypeTools } from './content-type/tools';
import { datasourceTools } from './datasource/tools';
import { fileTools } from './file/tools';

export const allTools: Tool[] = [
  ...configurationTools,
  ...contentTypeTools,
  ...datasourceTools,
  ...fileTools,
];
