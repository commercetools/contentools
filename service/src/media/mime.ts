const MIME_PATTERN = /^[a-z]+\/[a-z0-9.+-]+$/;

/** Throws a plain Error (without echoing the entry) when an entry is malformed. */
export function parseAllowedMimeTypes(csv: string): ReadonlySet<string> {
  const out = new Set<string>();
  for (const raw of csv.split(',')) {
    const entry = raw.trim().toLowerCase();
    if (entry === '') continue;
    if (!MIME_PATTERN.test(entry)) {
      throw new Error('invalid MIME type entry');
    }
    out.add(entry);
  }
  return out;
}

export function canonicalMime(declared: string): string {
  const base = (declared.split(';')[0] ?? '').trim().toLowerCase();
  return base === 'image/jpg' ? 'image/jpeg' : base;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg',
};

export function extensionFor(mime: string): string {
  return EXTENSIONS[mime] ?? 'bin';
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0): boolean =>
  buf.length >= offset + bytes.length &&
  bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf: Buffer, start: number, end: number): string =>
  buf.subarray(start, end).toString('latin1');

/** Detects the real type from the first bytes. Returns null when unknown. */
export function sniffMime(buf: Buffer): string | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  const head6 = ascii(buf, 0, 6);
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (ascii(buf, 4, 8) === 'ftyp') {
    const brand = ascii(buf, 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  if (ascii(buf, 0, 5) === '%PDF-') return 'application/pdf';
  const text = buf.subarray(0, 512).toString('utf8').trimStart();
  if (text.startsWith('<svg')) return 'image/svg+xml';
  if (text.startsWith('<?xml') && text.includes('<svg')) {
    return 'image/svg+xml';
  }
  return null;
}
