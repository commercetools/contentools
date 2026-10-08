/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createClient } from './build.client';

import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

import { readConfiguration } from '../utils/config.utils';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';
import { AuthenticatedRequest } from '../types/service.types';

/**
 * Create client with apiRoot
 * apiRoot can now be used to build requests to de Composable Commerce API
 */
export const createApiRoot = (req: AuthenticatedRequest) =>
  ((root?: ByProjectKeyRequestBuilder) => () => {
    if (root) {
      return root;
    }

    root = createApiBuilderFromCtpClient(createClient(req)).withProjectKey({
      projectKey: readConfiguration(req).projectKey,
    });

    return root;
  })();
