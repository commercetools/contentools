import { lazy } from 'react';
import { NimbusProvider } from '@commercetools/nimbus';
import {
  ApplicationShell,
  setupGlobalErrorListener,
} from '@commercetools-frontend/application-shell';
import type { ApplicationWindow } from '@commercetools-frontend/constants';
import loadMessages from '../../load-messages';
import { AuthProvider } from '../../contexts/auth';
import { ConnectProvider } from '../../contexts/connect';
import { BusinessUnitProvider } from '../../contexts/business-unit';

declare let window: ApplicationWindow;

// Here we split up the main (app) bundle with the actual application business logic.
// Splitting by route is usually recommended and you can potentially have a splitting
// point for each route. More info at https://reactjs.org/docs/code-splitting.html
const AsyncApplicationRoutes = lazy(
  () => import('../../routes' /* webpackChunkName: "routes" */)
);

// Ensure to setup the global error listener before any React component renders
// in order to catch possible errors on rendering/mounting.
setupGlobalErrorListener();

const EntryPoint = () => (
  <ApplicationShell
    enableReactStrictMode
    environment={window.app}
    applicationMessages={loadMessages}
  >
    {/* loadFonts={false}: the Merchant Center app-kit already loads Inter. */}
    <NimbusProvider loadFonts={false}>
      <AuthProvider>
        <ConnectProvider>
          <BusinessUnitProvider>
            <AsyncApplicationRoutes />
          </BusinessUnitProvider>
        </ConnectProvider>
      </AuthProvider>
    </NimbusProvider>
  </ApplicationShell>
);
EntryPoint.displayName = 'EntryPoint';

export default EntryPoint;
