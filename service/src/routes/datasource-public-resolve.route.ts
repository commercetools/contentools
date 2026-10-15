import { Router } from 'express';
import { publicResolveGuard } from '../middleware/public-resolve.middleware';
import { testDatasourceHandler } from './datasource-handlers';
import { validateKeyParams } from './params';

/**
 * PUBLIC (opt-in): `POST /datasource/:key/test` for built-in keys when
 * PUBLIC_DATASOURCE_RESOLVE=true. The guard skips to the protected route otherwise.
 */
export const datasourcePublicResolveRouter = Router();
validateKeyParams(datasourcePublicResolveRouter);

datasourcePublicResolveRouter.post(
  '/datasource/:key/test',
  publicResolveGuard,
  testDatasourceHandler
);
