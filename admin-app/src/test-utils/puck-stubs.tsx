/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Jest maps the three puck manager packages to this file (see jest.test.config.js): they are ESM-only and
// pull in the whole editor, which the Merchant Center jest preset cannot transform. Each stand-in prints the
// props it receives so tests can assert how the app wires the managers.
const makeStub = (testId: string) => {
  const Stub = (props: Record<string, unknown>) => (
    <div>
      <pre data-testid={testId}>{JSON.stringify(props)}</pre>
      <span data-testid={`${testId}-fetcher`}>{typeof props['fetcher']}</span>
      <span data-testid={`${testId}-keys`}>
        {Object.keys(props).sort().join(',')}
      </span>
    </div>
  );
  Stub.displayName = `Stub(${testId})`;
  return Stub;
};

export const PageManager = makeStub('page-manager');
export const ContentManager = makeStub('content-manager');
export const ThemeManager = makeStub('theme-manager');
