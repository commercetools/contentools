import fs from 'node:fs';
import path from 'node:path';
import { SERVICE_DIR, serviceBlock } from './support';

const CTP = [
  'CTP_API_URL',
  'CTP_AUTH_URL',
  'CTP_PROJECT_KEY',
  'CTP_CLIENT_ID',
  'CTP_CLIENT_SECRET',
  'CTP_SCOPE',
];
// Connect-provided or shared keys that a local run may set but the service block does not declare.
const OPTIONAL = ['CLOUD_IDENTIFIER'];

const parse = (): Map<string, string> => {
  const map = new Map<string, string>();
  const text = fs.readFileSync(path.join(SERVICE_DIR, '.env.example'), 'utf8');
  for (const line of text.split('\n')) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (m?.[1]) map.set(m[1], m[2] ?? '');
  }
  return map;
};

describe('.env.example', () => {
  const example = parse();
  const { standard, secured } = serviceBlock();
  const declared = [...standard, ...secured];

  it('lists every declared key, the CTP_ variables and PORT', () => {
    const expected = [...declared.map((e) => e.key), ...CTP, 'PORT'];
    const missing = expected.filter((k) => !example.has(k));
    expect(missing).toEqual([]);
    const extra = [...example.keys()].filter(
      (k) => !expected.includes(k) && !OPTIONAL.includes(k)
    );
    expect(extra).toEqual([]);
  });

  it('holds only empty values, manifest defaults or placeholders', () => {
    for (const entry of declared) {
      const value = example.get(entry.key) ?? '';
      expect([entry.default ?? '', '']).toContain(value);
    }
    for (const key of CTP) {
      const value = example.get(key) ?? '';
      expect(value).toMatch(/<[a-z-]+>/);
    }
    expect(example.get('PORT')).toBe('8080');
  });

  it('keeps secured keys empty', () => {
    for (const entry of secured) expect(example.get(entry.key)).toBe('');
  });
});
