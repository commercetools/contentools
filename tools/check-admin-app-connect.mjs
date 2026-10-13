#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Static guard for the `admin-app` block of the root connect.yaml (Merchant Center custom application).
//   node tools/check-admin-app-connect.mjs [path-to-connect.yaml]
// Rules: no endpoint/scripts/securedConfiguration, no APPLICATION_URL key (Connect provides it),
// the three operator keys are declared, CLOUD_IDENTIFIER is declared exactly once in the whole file.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_KEYS = ['CUSTOM_APPLICATION_ID', 'ENTRY_POINT_URI_PATH', 'CONTENTOOLS_SERVICE_URL'];

/** Returns a list of problems (empty when the manifest text is fine). `adminAppDirExists` is injectable for tests. */
export function checkAdminAppConnect(text, adminAppDirExists = true) {
  const problems = [];
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^ {2}- name: admin-app\s*$/.test(l));
  if (start === -1) {
    problems.push('no "  - name: admin-app" block found');
  } else {
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^ {2}- name:/.test(lines[i]) || /^\S/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const block = lines.slice(start, end);
    for (const line of block) {
      if (/^\s+(endpoint|scripts|securedConfiguration):/.test(line)) {
        problems.push(`forbidden in admin-app block: ${line.trim()}`);
      }
      if (line.includes('APPLICATION_URL')) {
        problems.push(`APPLICATION_URL must not be declared (Connect provides it): ${line.trim()}`);
      }
    }
    const blockText = block.join('\n');
    if (!/applicationType:\s*merchant-center-custom-application\b/.test(blockText)) {
      problems.push('admin-app block lacks applicationType: merchant-center-custom-application');
    }
    for (const key of REQUIRED_KEYS) {
      if (!new RegExp(`key:\\s*${key}\\s*$`, 'm').test(blockText)) {
        problems.push(`admin-app block lacks key ${key}`);
      }
    }
  }
  const cloud = (text.match(/key:\s*CLOUD_IDENTIFIER\s*$/gm) ?? []).length;
  if (cloud !== 1) problems.push(`CLOUD_IDENTIFIER must be declared exactly once, found ${cloud}`);
  if (!adminAppDirExists) problems.push('folder admin-app does not exist');
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'connect.yaml');
  const problems = checkAdminAppConnect(readFileSync(file, 'utf8'), existsSync(join(ROOT, 'admin-app')));
  if (problems.length > 0) {
    for (const p of problems) console.error(`FAIL: ${p}`);
    process.exit(1);
  }
  console.log('admin-app connect.yaml ok');
}
