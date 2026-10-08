/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Tool } from 'ai';
import ContentoolsAPI from '../shared/api';
import { allTools } from '../shared/tools';
import type { AuthConfig } from '../types/auth';
import ContentoolsTool from './tool';

class ContentoolsAgent {
  private _api: ContentoolsAPI;
  tools: Record<string, Tool>;

  constructor({
    authConfig,
  }: {
    authConfig: AuthConfig;
  }) {
    this._api = new ContentoolsAPI(authConfig);
    this.tools = {};

    for (const t of allTools) {
      this.tools[t.method] = ContentoolsTool(this._api, t.method, t.description, t.parameters);
    }
  }

  getTools(): Record<string, Tool> {
    return this.tools;
  }
}

export default ContentoolsAgent;
