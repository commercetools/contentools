/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Re-export Puck's own types so consumers import from a single package
export type {
  Config as PuckConfig,
  ComponentConfig as PuckComponentConfig,
  Data as PuckData,
  ComponentData as PuckComponentData,
  Fields,
  Field,
} from '@measured/puck';
