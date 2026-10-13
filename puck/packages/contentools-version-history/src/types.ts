/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { PuckData } from '@commercetools-labs/contentools-types';

export interface ComponentDiff {
  id: string;
  type: string;
  status: 'added' | 'removed' | 'changed';
  changedProps: string[];
}

export interface PuckDataDiff {
  components: ComponentDiff[];
  rootChanges: string[];
  hasChanges: boolean;
}

/**
 * Generic version entry shape shared by pages and content items.
 * Pages use `puckData`; content items use `data`.
 */
export interface VersionEntry {
  id: string;
  timestamp: string;
  puckData?: PuckData;
  data?: PuckData;
}
