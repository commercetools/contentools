/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { customObjects } from '../ct/custom-objects';
import { SecureTranspiler } from '../utils/secure-transpiler';
import { getLogger } from '../utils/logger.utils';
import { contentTypes as sampleContentTypes } from '../samples/content-types';

interface SampleContentTypeExport {
  metadata: Record<string, unknown> & { type?: string };
  code: {
    componentName: string;
    decodedText: string;
    transpiledCode?: string;
  };
}

export interface ImportResult {
  imported: string[];
  failed: Array<{ key: string; error: string }>;
}

/**
 * Derive key from metadata.type (e.g. WebsiteLogo -> website-logo).
 */
function typeToKey(type: string): string {
  return type
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Loops through content types from samples/content-types/index, transpiles code,
 * base64-encodes transpiled code and source text, and upserts custom objects
 * using the derived key (metadata.type in kebab-case).
 */
export async function importDefaultContentTypes(): Promise<ImportResult> {
  const result: ImportResult = { imported: [], failed: [] };
  const contentTypes = customObjects('contentType');

  for (const defaultExport of sampleContentTypes as SampleContentTypeExport[]) {
    const typeName = defaultExport.metadata?.type;
    const key = typeName ? typeToKey(typeName) : 'unknown';

    if (!defaultExport?.code?.decodedText || !defaultExport?.code?.componentName) {
      result.failed.push({
        key,
        error: 'Missing code.decodedText or code.componentName',
      });
      continue;
    }

    try {
      const sourceCode = defaultExport.code.decodedText;
      const componentName = defaultExport.code.componentName;

      const transpiledCode = SecureTranspiler.transpile(sourceCode, componentName);
      const transpiledCodeBase64 = Buffer.from(transpiledCode, 'utf-8').toString(
        'base64'
      );
      const textBase64 = Buffer.from(sourceCode, 'utf-8').toString('base64');

      const value = {
        key,
        metadata: defaultExport.metadata,
        code: {
          componentName,
          transpiledCode: transpiledCodeBase64,
          text: textBase64,
        },
      };

      await contentTypes.put(key, value);
      result.imported.push(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      getLogger().error('content type import failed', { key, message });
      result.failed.push({ key, error: message });
    }
  }

  return result;
}
