/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import ContentoolsAPI from '../shared/api';
import { allTools } from '../shared/tools';
import type { AuthConfig } from '../types/auth';
import ContentoolsTool from './tool';

class ContentoolsAgent {
  private _api: ContentoolsAPI;
  tools: DynamicStructuredTool[];

  constructor({
    authConfig,
  }: {
    authConfig: AuthConfig;
  }) {
    this._api = new ContentoolsAPI(authConfig);

    this.tools = allTools.map((t) =>
      ContentoolsTool(this._api, t.method, t.description, t.parameters)
    );
  }

  getTools(): DynamicStructuredTool[] {
    return this.tools;
  }
}

export default ContentoolsAgent;
