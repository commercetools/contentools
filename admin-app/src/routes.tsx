import { type ReactNode } from 'react';
import {
  Switch,
  Route,
  useRouteMatch,
  useHistory,
  Redirect,
} from 'react-router-dom';
import { ContentManager } from '@commercetools-demo/puck-content-manager';
import { PageManager } from '@commercetools-demo/puck-page-manager';
import { ThemeManager } from '@commercetools-demo/puck-theme-manager';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useAuth } from './contexts/auth';
import { useBusinessUnit } from './contexts/business-unit';
import AdminLayout from './components/admin-layout';
type ApplicationRoutesProps = {
  children?: ReactNode;
};
const ApplicationRoutes = (_props: ApplicationRoutesProps) => {
  const match = useRouteMatch();
  const history = useHistory();
  const { environment, dataLocale, project } = useApplicationContext<{
    CMS_API_URL: string;
    dataLocale: string;
  }>();

  const { jwtToken } = useAuth();
  const { selectedBusinessUnitKey } = useBusinessUnit();

  /**
   * When using routes, there is a good chance that you might want to
   * restrict the access to a certain route based on the user permissions.
   * You can evaluate user permissions using the `useIsAuthorized` hook.
   * For more information see https://docs.commercetools.com/merchant-center-customizations/development/permissions
   *
   * NOTE that by default the Custom Application implicitly checks for a "View" permission,
   * otherwise it won't render. Therefore, checking for "View" permissions here
   * is redundant and not strictly necessary.
   */

  return (
    <AdminLayout>
      <Switch>
        <Route path={`${match.path}/pages`}>
          <PageManager
            baseURL={environment.CMS_API_URL}
            businessUnitKey={selectedBusinessUnitKey}
            jwtToken={jwtToken ?? ''}
            parentUrl={`${match.url.slice(1)}/pages`}
            projectKey={project?.key ?? ''}
          />
        </Route>
        <Route path={`${match.path}/items`}>
          <ContentManager
            baseURL={environment.CMS_API_URL}
            businessUnitKey={selectedBusinessUnitKey}
            parentUrl={`${match.url.slice(1)}/items`}
            projectKey={project?.key ?? ''}
            jwtToken={jwtToken ?? ''}
          />
        </Route>
        <Route path={`${match.path}/theme`}>
          <ThemeManager
            baseURL={environment.CMS_API_URL}
            businessUnitKey={selectedBusinessUnitKey}
            // parentUrl={`${match.url.slice(1)}/items`}
            projectKey={project?.key ?? ''}
            jwtToken={jwtToken ?? ''}
          />
        </Route>

        <Route exact path={match.path}>
          <Redirect to={`${match.url}/pages`} />
        </Route>
      </Switch>
    </AdminLayout>
  );
};
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
