/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import ContentToolsAPI from '../shared/api';
import { allTools } from '../shared/tools';
import type { AuthConfig } from '../types/auth';
import ContentToolsTool from './tool';

class ContentToolsAgent {
  private _api: ContentToolsAPI;
  tools: DynamicStructuredTool[];

  constructor({
    authConfig,
  }: {
    authConfig: AuthConfig;
  }) {
    this._api = new ContentToolsAPI(authConfig);

    this.tools = allTools.map((t) =>
      ContentToolsTool(this._api, t.method, t.description, t.parameters)
    );
  }

  getTools(): DynamicStructuredTool[] {
    return this.tools;
  }
}

export default ContentToolsAgent;
