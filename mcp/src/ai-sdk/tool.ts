/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { tool } from 'ai';
import type { z } from 'zod';
import ContentToolsAPI from '../shared/api';
import { formatToolOutput } from '../shared/format';

export default function ContentToolsTool(
  api: ContentToolsAPI,
  method: string,
  description: string,
  schema: z.ZodObject<z.ZodRawShape>
) {
  return tool({
    description,
    inputSchema: schema,
    execute: async (arg: z.infer<typeof schema>) => {
      const result = await api.run(method, arg as Record<string, unknown>);
      return formatToolOutput(result);
    },
  });
}
