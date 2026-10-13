/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { buildToolset, type AdapterOptions } from '../options';

export type { AdapterOptions } from '../options';

export function createAiSdkTools(options: AdapterOptions): Record<string, Tool> {
  const { tools, run } = buildToolset(options);
  const out: Record<string, Tool> = {};
  for (const t of tools) {
    out[t.name] = tool({
      description: t.description,
      inputSchema: z.object(t.shape).strict(),
      execute: async (args: Record<string, unknown>) => run(t, args),
    });
  }
  return out;
}
