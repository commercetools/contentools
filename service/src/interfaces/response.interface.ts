/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { UpdateAction } from '@commercetools/sdk-client-v2';

export interface ResponseInterfaceSuccess {
  actions: Array<UpdateAction>;
}

export interface ResponseInterfaceError {
  errors: Array<unknown>;
}
