/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../test-utils';
import { PERMISSIONS } from '../constants';
import { isLocalServiceUrl, ServiceProvider, useService } from './service';

const Probe = () => {
  const { serviceUrl } = useService();
  return <div data-testid="service-url">{serviceUrl}</div>;
};

describe('isLocalServiceUrl', () => {
  it.each([
    ['http://localhost:8080/service', true],
    ['https://127.0.0.1/service', true],
    ['  http://localhost  ', true],
    ['https://a.b/service', false],
    ['https://localhost.evil.example/service', false],
    ['', false],
  ])('%p -> %p', (input, expected) => {
    expect(isLocalServiceUrl(input)).toBe(expected);
  });
});

describe('ServiceProvider', () => {
  it('provides the normalized service URL', async () => {
    renderApplication(
      <ServiceProvider>
        <Probe />
      </ServiceProvider>,
      { environment: { serviceUrl: 'https://svc.example/service/' } }
    );
    expect(await screen.findByTestId('service-url')).toHaveTextContent(
      'https://svc.example/service'
    );
  });

  it('shows the not-configured notice, without controls, for an empty URL', async () => {
    renderApplication(
      <ServiceProvider>
        <Probe />
      </ServiceProvider>,
      { environment: { serviceUrl: '' } }
    );
    expect(
      await screen.findByText(/service URL is not configured/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('service-url')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts a local http URL for development', async () => {
    renderApplication(
      <ServiceProvider>
        <Probe />
      </ServiceProvider>,
      { environment: { serviceUrl: 'http://localhost:8080/service' } }
    );
    expect(await screen.findByTestId('service-url')).toHaveTextContent(
      'http://localhost:8080/service'
    );
  });
});

describe('PERMISSIONS', () => {
  it('derives the permission keys from the registered path', () => {
    expect(PERMISSIONS.View).toBe('ViewContentools');
    expect(PERMISSIONS.Manage).toBe('ManageContentools');
  });
});
