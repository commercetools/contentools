/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Component, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { Alert } from '@commercetools/nimbus';
import messages from '../i18n/messages';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** puck formats failed calls as `[contentools-api] HTTP 403: ...`; the service answers 403 for a missing permission. */
const isForbidden = (error: Error) => /HTTP 403/.test(error.message);

/** Catches errors thrown while a manager renders and shows a translated notice instead of a blank page. */
class ServiceErrorBoundary extends Component<Props, State> {
  static displayName = 'ServiceErrorBoundary';

  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Alert.Root colorPalette="critical" variant="outlined" role="alert">
        <Alert.Description>
          {isForbidden(error) ? (
            <FormattedMessage {...messages.notAllowed} />
          ) : (
            <FormattedMessage
              {...messages.requestFailed}
              values={{ message: error.message }}
            />
          )}
        </Alert.Description>
      </Alert.Root>
    );
  }
}

export default ServiceErrorBoundary;
