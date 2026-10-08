import type { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import ContentToolsAPI from '../shared/api';
import { formatToolOutput } from '../shared/format';

export default function ContentToolsTool(
  api: ContentToolsAPI,
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
