/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { describe, expect, it } from 'vitest';
import { allTools } from './tools';

describe('tools registry', () => {
  it('loads and exposes at least one tool', () => {
    expect(allTools.length).toBeGreaterThan(0);
  });

  it('has unique tool method names', () => {
    expect(new Set(allTools.map((t) => t.method)).size).toBe(allTools.length);
  });
});
