/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../../test-utils';
import { useMockServer } from '../../test-utils/msw';

// The route tree pulls in the ESM-only puck packages, which the MC jest preset cannot transform yet
// (spec K fixes that). Keep the harness smoke independent of it.
jest.mock('../../routes', () => ({ __esModule: true, default: () => null }));

useMockServer();

describe('test harness smoke', () => {
  it('renders a trivial element through renderApplication', async () => {
    renderApplication(<div>ok</div>, {});
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });
});
