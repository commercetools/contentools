import {
  fireEvent,
  screen,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplication } from '../test-utils';
import { BusinessUnitProvider, useBusinessUnit } from './business-unit';
import AdminLayout from '../components/admin-layout';
import { useBusinessUnits } from '../hooks/use-business-units';

jest.mock('../hooks/use-business-units');
const mockedUseBusinessUnits = jest.mocked(useBusinessUnits);

const Selected = () => {
  const { selectedBusinessUnitKey } = useBusinessUnit();
  return <div data-testid="selected">{selectedBusinessUnitKey}</div>;
};

const renderLayout = () =>
  renderApplication(
    <BusinessUnitProvider>
      <AdminLayout>
        <Selected />
      </AdminLayout>
    </BusinessUnitProvider>,
    { route: '/my-project/contentools/pages' }
  );

describe('business unit selector', () => {
  it('is hidden when only the default unit exists', async () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [],
      loading: false,
    });
    renderLayout();
    expect(await screen.findByTestId('selected')).toHaveTextContent('default');
    expect(screen.queryByText('Business unit')).not.toBeInTheDocument();
  });

  it('is shown for two units and propagates the selection', async () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [{ key: 'acme-b2b', name: 'Acme B2B' }],
      loading: false,
    });
    renderLayout();
    expect(await screen.findByText('Business unit')).toBeInTheDocument();
    expect(screen.getByTestId('selected')).toHaveTextContent('default');

    fireEvent.click(screen.getByRole('button', { name: /default/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Acme B2B' }));
    expect(await screen.findByTestId('selected')).toHaveTextContent('acme-b2b');
  });
});
