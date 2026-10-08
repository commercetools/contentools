import { z } from 'zod';
import type { Tool } from '../../types/tools';

const keyParam = z.string().describe('Content type key');
const propertySchemaSchema = z.object({
  type: z.string(),
  label: z.string(),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.any(), label: z.string() })).optional(),
  extensions: z.array(z.string()).optional(),
  order: z.number().optional(),
  datasourceType: z.string().optional(),
});
const contentTypeMetadataSchema = z.object({
  type: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  defaultProperties: z.record(z.string(), z.any()).optional(),
  propertySchema: z.record(z.string(), propertySchemaSchema),
  isBuiltIn: z.boolean().optional(),
});
const contentTypeDataSchema = z.object({
  id: z.string().optional(),
  key: z.string().optional(),
  metadata: contentTypeMetadataSchema,
  code: z
    .object({
      componentName: z.string(),
      transpiledCode: z.string(),
      text: z.string(),
    })
    .optional(),
});

export const contentTypeTools: Tool[] = [
  {
    method: 'list_content_types',
    name: 'List Content Types',
    description: 'Get all content types for the project.',
    parameters: z.object({}),
    actions: { content_type: { read: true } },
  },
  {
    method: 'get_content_type',
    name: 'Get Content Type',
    description: 'Get a content type by key.',
    parameters: z.object({ key: keyParam }),
    actions: { content_type: { read: true } },
  },
  {
    method: 'create_content_type',
    name: 'Create Content Type',
    description: 'Create a new content type.',
    parameters: z.object({ value: contentTypeDataSchema }),
    actions: { content_type: { create: true } },
  },
  {
    method: 'update_content_type',
    name: 'Update Content Type',
    description: 'Update an existing content type by key.',
    parameters: z.object({ key: keyParam, value: contentTypeDataSchema }),
    actions: { content_type: { update: true } },
  },
  {
    method: 'delete_content_type',
    name: 'Delete Content Type',
    description: 'Delete a content type by key.',
    parameters: z.object({ key: keyParam }),
    actions: { content_type: { update: true } },
  },
  {
    method: 'import_content_types',
    name: 'Import Default Content Types',
    description: 'Import default content types from samples. Requires JWT.',
    parameters: z.object({}),
    actions: { content_type: { create: true } },
  },
];
