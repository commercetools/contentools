/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SERVICE_DIR, readManifest, serviceBlock } from './support';

const HEADINGS = [
  'What it is',
  'Run locally',
  'Deploy',
  'Scopes',
  'Configuration',
  'Lifecycle scripts',
  'Fail-open and fail-closed',
  'Logs and correlation ids',
  'Poison messages and replay',
  'Troubleshooting',
];

const readme = fs.readFileSync(path.join(SERVICE_DIR, 'README.md'), 'utf8');

function section(heading: string): string {
  const lines = readme.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start < 0) throw new Error(`missing section ${heading}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

const cells = (line: string): string[] =>
  line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

describe('service README', () => {
  it('opens with the unsupported banner', () => {
    expect(readme).toMatch(/^# .+\n\n> Unsupported:/);
  });

  it('has the required second-level headings in order', () => {
    const found = readme
      .split('\n')
      .filter((l) => l.startsWith('## '))
      .map((l) => l.slice(3));
    expect(found).toEqual(HEADINGS);
  });

  it('lists every manifest key in the Configuration table with matching kind and default', () => {
    const { standard, secured } = serviceBlock();
    const expected = new Map<string, { kind: string; def: string }>();
    for (const e of standard) {
      expected.set(e.key, { kind: 'standard', def: e.default ?? '-' });
    }
    for (const e of secured) {
      expected.set(e.key, { kind: 'secured', def: e.default ?? '-' });
    }
    const rows = section('Configuration')
      .split('\n')
      .filter((l) => l.startsWith('| `'))
      .map(cells);
    const actual = new Map(
      rows.map((c) => [
        (c[0] ?? '').replace(/`/g, ''),
        { kind: c[1] ?? '', def: (c[3] ?? '').replace(/`/g, '') },
      ])
    );
    expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [key, want] of expected) {
      expect(actual.get(key)).toEqual(want);
    }
  });

  it('mentions exactly the two manifest scopes in Scopes', () => {
    const text = section('Scopes');
    const mentioned = text.match(/\b(?:manage|view)_[a-z_]+/g) ?? [];
    const unique = [...new Set(mentioned)].filter(
      (s) => s !== 'manage_project'
    );
    expect(unique.sort()).toEqual(
      [...(readManifest().inheritAs?.apiClient?.scopes ?? [])].sort()
    );
  });

  it('states the fail-open and fail-closed stance', () => {
    const text = section('Fail-open and fail-closed');
    expect(text).toContain('API Extension');
    expect(text).toContain('never block');
  });

  it('explains that there is nothing to replay', () => {
    expect(section('Poison messages and replay')).toContain(
      'not an event application'
    );
  });

  it('tells operators to read the deployment logs', () => {
    expect(section('Lifecycle scripts')).toContain('deployment logs');
  });
});
