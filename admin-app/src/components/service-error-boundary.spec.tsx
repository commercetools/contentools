/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../test-utils';
import ServiceErrorBoundary from './service-error-boundary';

const Boom = ({ message }: { message: string }): never => {
  throw new Error(message);
};

describe('ServiceErrorBoundary', () => {
  // React logs caught render errors; the preset fails tests on console.error, so silence it here.
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows the request failure with the caught message', async () => {
    renderApplication(
      <ServiceErrorBoundary>
        <Boom message="[contentools-api] HTTP 500: boom" />
      </ServiceErrorBoundary>,
      {}
    );
    expect(
      await screen.findByText(
        'The request to the service failed: [contentools-api] HTTP 500: boom'
      )
    ).toBeInTheDocument();
  });

  it('maps HTTP 403 to the not-allowed notice', async () => {
    renderApplication(
      <ServiceErrorBoundary>
        <Boom message="[contentools-api] HTTP 403: forbidden" />
      </ServiceErrorBoundary>,
      {}
    );
    expect(
      await screen.findByText(/You are not allowed to do this/)
    ).toBeInTheDocument();
  });

  it('renders its children when nothing fails', async () => {
    renderApplication(
      <ServiceErrorBoundary>
        <div>fine</div>
      </ServiceErrorBoundary>,
      {}
    );
    expect(await screen.findByText('fine')).toBeInTheDocument();
  });
});
