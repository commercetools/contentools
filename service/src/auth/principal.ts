export type Principal =
  | {
      kind: 'merchant-center';
      userId: string;
      projectKey: string;
      permissions: string[];
    }
  | { kind: 'service-token' };
