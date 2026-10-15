import type { z } from 'zod';
import CustomError from '../errors/custom.error';

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CustomError(
      400,
      result.error.issues[0]?.message ?? 'Invalid request body'
    );
  }
  return result.data;
}

/** Returns `data.value` when it is a non-null, non-array object. */
export function valueBody(data: unknown): Record<string, unknown> {
  if (typeof data === 'object' && data !== null) {
    const value = (data as { value?: unknown }).value;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  throw new CustomError(400, 'value is required in request body');
}
