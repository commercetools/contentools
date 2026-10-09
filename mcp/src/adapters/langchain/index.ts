/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { buildToolset, type AdapterOptions } from '../options';

export type { AdapterOptions } from '../options';

export function createLangChainTools(options: AdapterOptions): DynamicStructuredTool[] {
  const { tools, run } = buildToolset(options);
  return tools.map(
    (t) =>
      new DynamicStructuredTool({
        name: t.name,
        description: t.description,
        schema: z.object(t.shape).strict(),
        func: async (args: Record<string, unknown>) => run(t, args),
      })
  );
}
