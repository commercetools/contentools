/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Split connect.yaml text into { apps: [{name, applicationType, endpoint, keys, scripts, start}], inherit, inheritCount }.
 * Supported subset: the `deployAs:` list written with two-space indentation (`  - name: x`), scalar `key: value`
 * lines, `standardConfiguration:` / `securedConfiguration:` lists of `- key: NAME`, and the top-level `inheritAs:` map.
 * Anything else is ignored (`commercetools connect validate` is the authority).
 */
export function parseConnectYaml(text) {
  const lines = text.split('\n');
  const apps = [];
  let cur = null;
  let section = null;
  let inherit = null;
  let inheritCount = 0;
  let top = null;
  lines.forEach((raw, i) => {
    const n = i + 1;
    if (/^\S/.test(raw) && !raw.startsWith('#')) {
      top = raw.replace(/:.*/, '');
      cur = null;
      section = null;
      if (top === 'inheritAs') {
        inheritCount += 1;
        inherit = { start: n, lines: [] };
      }
      return;
    }
    if (top === 'inheritAs' && inherit) inherit.lines.push({ n, text: raw });
    if (top !== 'deployAs') return;
    if (/^\s*#/.test(raw)) return;
    const m = /^ {2}- name:\s*(\S+)/.exec(raw);
    if (m) {
      cur = { name: m[1], start: n, applicationType: null, endpoint: null, keys: [], scripts: {} };
      apps.push(cur);
      section = null;
      return;
    }
    if (!cur) return;
    let k;
    if ((k = /^\s+applicationType:\s*(\S+)/.exec(raw))) cur.applicationType = k[1];
    else if ((k = /^\s+endpoint:\s*(\S+)/.exec(raw))) cur.endpoint = { value: k[1], n };
    else if ((k = /^\s+(standardConfiguration|securedConfiguration):/.exec(raw))) section = k[1];
    else if ((k = /^\s+(postDeploy|preUndeploy):\s*(.+)$/.exec(raw))) cur.scripts[k[1]] = { cmd: k[2].trim(), n };
    else if ((k = /^\s+- key:\s*(\S+)/.exec(raw))) cur.keys.push({ key: k[1], section, n });
  });
  return { apps, inherit, inheritCount };
}

/** Collect the `- <scope>` list items under `scopes:` (accepts inline `[a, b]` arrays too). null when there is no `scopes:`. */
export function scopesOf(inherit) {
  if (!inherit) return null;
  const ls = inherit.lines;
  const idx = ls.findIndex((l) => /^\s+scopes:/.test(l.text));
  if (idx < 0) return null;
  const inline = /scopes:\s*\[(.*)\]/.exec(ls[idx].text);
  if (inline) return inline[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const indent = ls[idx].text.match(/^\s*/)[0].length;
  const out = [];
  for (let j = idx + 1; j < ls.length; j++) {
    const t = ls[j].text;
    if (/^\s*(#.*)?$/.test(t)) continue;
    const m = /^(\s*)-\s+(\S+)/.exec(t);
    if (!m || m[1].length < indent) break;
    out.push(m[2].replace(/^['"]|['"]$/g, ''));
  }
  return out;
}
