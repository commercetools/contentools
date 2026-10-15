import { MediaError } from './errors';

const MAX_TOKEN = 2048;

interface CursorPayload {
  v: 1;
  bu: string;
  ext: string;
  t: string;
}

export function encodeCursor(c: {
  bu: string;
  ext: string;
  t: string;
}): string {
  const payload: CursorPayload = { v: 1, ...c };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

const invalid = (): MediaError =>
  new MediaError(400, 'MEDIA_INVALID_CURSOR', 'Invalid cursor');

/** Returns the provider token. Throws MEDIA_INVALID_CURSOR on any problem or request mismatch. */
export function decodeCursor(
  raw: string,
  expect: { bu: string; ext: string }
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (typeof parsed !== 'object' || parsed === null) throw invalid();
  const c = parsed as Partial<CursorPayload>;
  if (
    c.v !== 1 ||
    typeof c.t !== 'string' ||
    c.t.length === 0 ||
    c.t.length > MAX_TOKEN ||
    c.bu !== expect.bu ||
    c.ext !== expect.ext
  ) {
    throw invalid();
  }
  return c.t;
}
