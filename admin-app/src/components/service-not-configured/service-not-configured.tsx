import { FormattedMessage } from 'react-intl';
import { Card, Text } from '@commercetools/nimbus';
import messages from '../../i18n/messages';

/** Shown instead of the app when `serviceUrl` is missing or not https. It renders no controls. */
const ServiceNotConfigured = () => (
  <Card.Root maxWidth="640px" margin="400">
    <Card.Body>
      <Text role="alert">
        <FormattedMessage {...messages.serviceNotConfigured} />
      </Text>
    </Card.Body>
  </Card.Root>
);
ServiceNotConfigured.displayName = 'ServiceNotConfigured';

export default ServiceNotConfigured;
