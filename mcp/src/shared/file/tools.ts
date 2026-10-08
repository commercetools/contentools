import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');

export const fileTools: Tool[] = [
  {
    method: 'upload_file',
    name: 'Upload File',
    description: 'Upload a file to the media library. Pass fileContent as base64 and optional fileName, title, description.',
    parameters: z.object({
      businessUnitKey: bu,
      title: z.string().optional(),
      description: z.string().optional(),
      fileContent: z.string().optional().describe('Base64-encoded file content'),
      fileName: z.string().optional().describe('Filename for the upload'),
    }),
    actions: { file: { create: true } },
  },
  {
    method: 'get_media_library',
    name: 'Get Media Library',
    description: 'List media library entries with optional pagination and extensions filter.',
    parameters: z.object({
      businessUnitKey: bu,
      page: z.number().optional(),
      limit: z.number().optional(),
      extensions: z.array(z.string()).optional().describe('Filter by file extensions'),
    }),
    actions: { file: { read: true } },
  },
  {
    method: 'compile_upload',
    name: 'Compile and Upload',
    description: 'Compile code files and upload as a content type. Body: files (record of filename -> { content }), key (content type key).',
    parameters: z.object({
      files: z.record(z.string(), z.object({ content: z.string() })).describe('Map of filename to file content'),
      key: z.string().describe('Content type key'),
    }),
    actions: { file: { create: true } },
  },
];
