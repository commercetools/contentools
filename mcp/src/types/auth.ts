/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Authentication and context for the Contentools API.
 * All API calls use baseUrl with x-project-key and optionally Authorization: Bearer jwtToken.
 */
export type AuthConfig = {
  baseUrl: string;
  projectKey: string;
  businessUnitKey?: string;
  jwtToken?: string;
};
