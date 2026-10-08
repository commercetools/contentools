/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { PuckPageValue, PuckStateInfo } from './puck-page.types';

// Re-export for convenience
export type { PuckStateInfo };

export interface PuckPageState {
  key: string;
  businessUnitKey: string;
  states: PuckStateInfo;
}

export interface PuckPageVersionEntry extends PuckPageValue {
  id: string;
  timestamp: string;
}

export interface PuckPageVersion {
  key: string;
  businessUnitKey: string;
  versions: PuckPageVersionEntry[];
}
