import type { AuthConfig } from '../types/auth';
import { createFunctionMap } from './functions';

class ContentToolsAPI {
  private baseUrl: string;
  private projectKey: string;
  private businessUnitKey: string | undefined;
  private jwtToken: string | undefined;
  private functionMap: ReturnType<typeof createFunctionMap>;

  constructor(authConfig: AuthConfig) {
    this.baseUrl = authConfig.baseUrl.replace(/\/$/, '');
    this.projectKey = authConfig.projectKey;
    this.businessUnitKey = authConfig.businessUnitKey;
    this.jwtToken = authConfig.jwtToken;
    this.functionMap = createFunctionMap(
      this.baseUrl,
      this.projectKey,
      this.businessUnitKey,
      this.jwtToken
    );
  }

  async run(method: string, arg: Record<string, unknown>): Promise<unknown> {
    const fn = this.functionMap[method];
    if (!fn) {
      throw new Error(`Unknown method: ${method}`);
    }
    const ctx = {
      baseUrl: this.baseUrl,
      projectKey: (arg.projectKey as string) ?? this.projectKey,
      businessUnitKey: (arg.businessUnitKey as string) ?? this.businessUnitKey ?? 'default',
      jwtToken: (arg.jwtToken as string) ?? this.jwtToken,
    };
    return fn(ctx, arg);
  }
}

export default ContentToolsAPI;
