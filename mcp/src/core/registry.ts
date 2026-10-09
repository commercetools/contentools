/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { TOOL_GROUPS, type AnyToolDefinition, type ToolGroup } from './types';
import { pagesTools } from './tools/pages';
import { contentsTools } from './tools/contents';
import { templatesTools } from './tools/templates';
import { configurationTools } from './tools/configuration';
import { datasourcesTools } from './tools/datasources';
import { productsTools } from './tools/products';
import { mediaTools } from './tools/media';
import { contentTypesTools } from './tools/content-types';

export const ALL_TOOLS: readonly AnyToolDefinition[] = [
  ...pagesTools,
  ...contentsTools,
  ...templatesTools,
  ...configurationTools,
  ...datasourcesTools,
  ...productsTools,
  ...mediaTools,
  ...contentTypesTools,
];

export interface ToolSelection {
  groups: 'all' | readonly ToolGroup[];
  enableWrites: boolean;
}

export function selectTools(
  sel: ToolSelection,
  all: readonly AnyToolDefinition[] = ALL_TOOLS
): AnyToolDefinition[] {
  return all.filter(
    (t) =>
      (sel.groups === 'all' || sel.groups.includes(t.group)) &&
      (t.access === 'read' || sel.enableWrites)
  );
}

export function parseGroups(raw: string | undefined): 'all' | ToolGroup[] {
  const value = (raw ?? '').trim();
  if (value === '' || value === 'all') return 'all';
  const groups: ToolGroup[] = [];
  for (const part of value.split(',')) {
    const x = part.trim();
    if (!(TOOL_GROUPS as readonly string[]).includes(x)) {
      throw new Error(`Unknown MCP_TOOL_GROUPS entry: ${x}`);
    }
    groups.push(x as ToolGroup);
  }
  return groups;
}
