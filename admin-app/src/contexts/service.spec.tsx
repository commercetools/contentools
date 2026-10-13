/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../test-utils';
import { PERMISSIONS } from '../constants';
import { normalizeServiceUrl, ServiceProvider, useService } from './service';

const Probe = () => {
  const { serviceUrl } = useService();
  return <div data-testid="service-url">{serviceUrl}</div>;
};

describe('normalizeServiceUrl', () => {
  it.each([
    ['https://a.b/service/', 'https://a.b/service'],
    ['  https://a.b/service  ', 'https://a.b/service'],
    ['http://localhost:8080/service', null],
    ['', null],
    [undefined, null],
    [42, null],
  ])('%p -> %p', (input, expected) => {
    expect(normalizeServiceUrl(input)).toBe(expected);
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

  it('shows the not-configured notice for a non-https URL', async () => {
    renderApplication(
      <ServiceProvider>
        <Probe />
      </ServiceProvider>,
      { environment: { serviceUrl: 'http://localhost:8080/service' } }
    );
    expect(
      await screen.findByText(/service URL is not configured/i)
    ).toBeInTheDocument();
  });
});

describe('PERMISSIONS', () => {
  it('derives the permission keys from the registered path', () => {
    expect(PERMISSIONS.View).toBe('ViewContentools');
    expect(PERMISSIONS.Manage).toBe('ManageContentools');
  });
});
