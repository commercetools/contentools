/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import type { z } from 'zod';

export const TOOL_GROUPS = [
  'pages',
  'contents',
  'templates',
  'configuration',
  'datasources',
  'products',
  'media',
  'content-types',
] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number];

export interface RequestContext {
  defaultBusinessUnitKey: string;
}

export interface ServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Relative to CONTENT_SERVICE_URL, percent-encoded, may contain ?query. */
  path: string;
  body?: unknown;
  multipart?: {
    fields: Record<string, string>;
    file?: { name: string; contentBase64: string };
  };
}

export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  group: ToolGroup;
  access: 'read' | 'write';
  shape: S;
  request(input: z.infer<z.ZodObject<S>>, ctx: RequestContext): ServiceRequest;
}

export type AnyToolDefinition = ToolDefinition<z.ZodRawShape>;

/** Erases the shape generic so heterogeneous tools fit in one array while the callback stays typed. */
export function defineTool<S extends z.ZodRawShape>(
  def: ToolDefinition<S>
): AnyToolDefinition {
  return def as unknown as AnyToolDefinition;
}
