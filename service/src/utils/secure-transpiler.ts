import { transform } from '@babel/standalone';

export class SecureTranspiler {
  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /document\.(write|createElement)/,
    /innerHTML\s*=/,
    /outerHTML\s*=/,
    /window\./,
    /global\./,
    /process\./,
    /__dirname|__filename/,
    /require\s*\(/,
    /import\s*\(/,
  ];

  static validateCode(code: string): void {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        throw new Error(`Potentially unsafe code detected: ${pattern.source}`);
      }
    }

    if (code.length > 50000) {
      throw new Error('Component code exceeds maximum size limit');
    }
  }

  static cleanCode(sourceCode: string): string {
    return sourceCode
      .replace(/import\s+.*?\s+from\s+['"][^'"]*['"];?\s*/g, '')
      .replace(/import\s+['"][^'"]*['"];?\s*/g, '');
  }

  static transpile(sourceCode: string, componentName: string): string {
    this.validateCode(sourceCode);
    const cleanedCode = this.cleanCode(sourceCode);

    try {
      const result = transform(cleanedCode, {
        presets: ['react'],
        sourceMaps: false,
        compact: true,
      });

      if (!result.code) {
        throw new Error('Transpilation produced no output');
      }

      return `
          (function(React) {
            "use strict";
            ${result.code}
            
            if (typeof Component !== 'undefined') return Component;
            if (typeof ${componentName} !== 'undefined') return ${componentName};
            
            throw new Error('No valid React component found');
          })
        `;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Transpilation failed: ${message}`);
    }
  }
}
