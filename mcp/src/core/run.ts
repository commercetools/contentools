/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import type { AnyToolDefinition, RequestContext } from './types';
import { ContentoolsClient, ServiceError } from './client';
import { ToolInputError } from './predicate';
import { formatToolOutput } from './format';

export interface ToolRunResult {
  ok: boolean;
  text: string;
}

export async function runTool(
  tool: AnyToolDefinition,
  args: unknown,
  deps: { client: ContentoolsClient; ctx: RequestContext; correlationId?: string }
): Promise<ToolRunResult> {
  try {
    // Adapters that skip SDK validation still get strictness.
    const input = z.object(tool.shape).strict().parse(args);
    return {
      ok: true,
      text: formatToolOutput(
        await deps.client.execute(tool.request(input, deps.ctx), deps.correlationId)
      ),
    };
  } catch (e) {
    if (e instanceof ServiceError || e instanceof ToolInputError) {
      return { ok: false, text: e.message };
    }
    if (e instanceof z.ZodError) {
      return {
        ok: false,
        text: `Invalid input: ${e.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`.slice(0, 500),
      };
    }
    return { ok: false, text: 'Unexpected error' };
  }
}
