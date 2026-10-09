/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Switch, Route, Redirect, useRouteMatch } from 'react-router-dom';
import { ContentManager } from '@commercetools-labs/puck-content-manager';
import { PageManager } from '@commercetools-labs/puck-page-manager';
import { ThemeManager } from '@commercetools-labs/puck-theme-manager';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useBusinessUnit } from './contexts/business-unit';
import { useService } from './contexts/service';
import AdminLayout from './components/admin-layout';
import ServiceErrorBoundary from './components/service-error-boundary';

const ApplicationRoutes = () => {
  const match = useRouteMatch();
  const dataLocale = useApplicationContext(
    (ctx) => ctx.dataLocale ?? undefined
  );
  const { selectedBusinessUnitKey } = useBusinessUnit();
  const { serviceUrl, fetcher } = useService();
  const common = {
    baseURL: serviceUrl,
    businessUnitKey: selectedBusinessUnitKey,
    locale: dataLocale,
    fetcher,
  };
  return (
    <AdminLayout>
      <ServiceErrorBoundary>
        <Switch>
          <Route path={`${match.path}/pages`}>
            <PageManager
              key={selectedBusinessUnitKey}
              {...common}
              parentUrl={`${match.url}/pages`}
            />
          </Route>
          <Route path={`${match.path}/items`}>
            <ContentManager
              key={selectedBusinessUnitKey}
              {...common}
              parentUrl={`${match.url}/items`}
            />
          </Route>
          <Route path={`${match.path}/theme`}>
            <ThemeManager key={selectedBusinessUnitKey} {...common} />
          </Route>
          <Route exact path={match.path}>
            <Redirect to={`${match.url}/pages`} />
          </Route>
        </Switch>
      </ServiceErrorBoundary>
    </AdminLayout>
  );
};
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
