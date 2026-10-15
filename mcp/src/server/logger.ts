/** Callers pass only: msg, correlationId, method, tool, outcome, status, ms (never args, bodies, headers or tokens). */
export function log(entry: Record<string, string | number | boolean | undefined>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
}
