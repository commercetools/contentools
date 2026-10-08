/**
 * Format API result for tool output (string for LLM consumption).
 */
export function formatToolOutput(result: unknown): string {
  if (result === undefined || result === null) return '';
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
