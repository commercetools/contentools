/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import ContentoolsAPI from '../shared/api';
import { formatToolOutput } from '../shared/format';

export default function ContentoolsTool(
  api: ContentoolsAPI,
  method: string,
  description: string,
  schema: z.ZodObject<z.ZodRawShape>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: method,
    description,
    schema,
    func: async (arg: z.infer<typeof schema>) => {
      const result = await api.run(method, arg as Record<string, unknown>);
      return formatToolOutput(result);
    },
  });
}
