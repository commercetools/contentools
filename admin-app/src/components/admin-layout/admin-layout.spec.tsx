/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { IntlProvider } from 'react-intl';
import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../../test-utils';
import { BusinessUnitProvider } from '../../contexts/business-unit';
import AdminLayout from '.';
import en from '../../i18n/data/en.json';
import de from '../../i18n/data/de.json';

jest.mock('../../hooks/use-business-units', () => ({
  useBusinessUnits: () => ({ businessUnits: [], loading: false }),
}));

const renderLayout = (locale: string) =>
  renderApplication(
    // The test shell does not load the app's own catalogs, so provide the one under test.
    <IntlProvider locale={locale} messages={locale === 'de' ? de : en}>
      <BusinessUnitProvider>
        <AdminLayout>
          <div>content</div>
        </AdminLayout>
      </BusinessUnitProvider>
    </IntlProvider>,
    { locale, route: '/my-project/contentools/pages' }
  );

describe('AdminLayout navigation', () => {
  it('shows the English labels', async () => {
    renderLayout('en');
    expect(await screen.findByText('Pages')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('shows the German labels', async () => {
    renderLayout('de');
    expect(await screen.findByText('Seiten')).toBeInTheDocument();
    expect(screen.getByText('Inhalte')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });
});
