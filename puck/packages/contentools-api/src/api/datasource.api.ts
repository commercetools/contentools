import type { PuckClient } from '../client/client';
import { enc } from '../client/path';

export const resolveDatasourceApi = (
  client: PuckClient,
  datasourceKey: string,
  body: { params: Record<string, string> }
) =>
  client.request<unknown>(
    'resolveDatasourceApi',
    `/datasource/${enc(datasourceKey)}/test`,
    { method: 'POST', body }
  );
