/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from './test-utils';
import ApplicationRoutes from './routes';
import { ServiceProvider } from './contexts/service';
import { BusinessUnitProvider } from './contexts/business-unit';
import { entryPointUriPath } from './constants';

// The three manager packages resolve to src/test-utils/puck-stubs.tsx (jest.test.config.js).
jest.mock('./hooks/use-business-units', () => ({
  useBusinessUnits: () => ({ businessUnits: [], loading: false }),
}));

const renderAt = (path: string) =>
  renderApplication(
    <ServiceProvider>
      <BusinessUnitProvider>
        <ApplicationRoutes />
      </BusinessUnitProvider>
    </ServiceProvider>,
    {
      route: `/my-project/${entryPointUriPath}${path}`,
      environment: { serviceUrl: 'https://svc.example/service' },
    }
  );

const propsOf = (testId: string) =>
  JSON.parse(screen.getByTestId(testId).textContent ?? '{}') as Record<
    string,
    unknown
  >;

describe('routes', () => {
  it.each([
    ['/pages', 'page-manager'],
    ['/items', 'content-manager'],
    ['/theme', 'theme-manager'],
  ])(
    '%s mounts %s with the service connection and no credentials',
    async (path, testId) => {
      renderAt(path);
      await screen.findByTestId(testId);
      const props = propsOf(testId);
      expect(props.baseURL).toBe('https://svc.example/service');
      expect(props.businessUnitKey).toBe('default');
      expect(props).not.toHaveProperty('projectKey');
      expect(props).not.toHaveProperty('jwtToken');
      expect(screen.getByTestId(`${testId}-fetcher`)).toHaveTextContent(
        'function'
      );
      expect(screen.getByTestId(`${testId}-keys`).textContent).not.toMatch(
        /projectKey|jwtToken/
      );
    }
  );

  it('passes the full parent path (with project key) to the nested routers', async () => {
    renderAt('/pages');
    await screen.findByTestId('page-manager');
    expect(propsOf('page-manager').parentUrl).toBe(
      `/my-project/${entryPointUriPath}/pages`
    );
  });

  it('redirects the base path to /pages', async () => {
    renderAt('');
    expect(await screen.findByTestId('page-manager')).toBeInTheDocument();
  });
});
