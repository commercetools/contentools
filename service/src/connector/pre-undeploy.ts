/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { CONTAINER_NAMES } from '../config/containers';

const prefix = process.env.CONTAINER_PREFIX?.trim() ?? '';
const mediaPrefix =
  process.env.MEDIA_PATH_PREFIX?.trim() || 'contentools/media';

// Nothing is deleted on undeploy: Custom Objects hold the pages and the bucket holds the media.
process.stdout.write(
  `${JSON.stringify({
    msg: 'pre-undeploy',
    status: 'ok',
    retained: {
      customObjectContainers: Object.values(CONTAINER_NAMES).map(
        (n) => `${prefix}${n}`
      ),
      mediaPrefix,
    },
  })}\n`
);
