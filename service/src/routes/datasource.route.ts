import { Router } from 'express';
import {
  createDatasource,
  deleteDatasource,
  getDatasource,
  listDatasources,
  putDatasource,
} from '../controllers/datasource.controller';
import { parseOrThrow, valueBody } from '../schemas/common';
import { datasourceValue } from '../schemas/datasource';
import { testDatasourceHandler } from './datasource-handlers';
import { param, validateKeyParams, wrap } from './params';

/** PROTECTED: mount after the auth gate. */
export const datasourceRouter = Router();
validateKeyParams(datasourceRouter);

datasourceRouter.get(
  '/datasource',
  wrap(async (_req, res) => {
    res.status(200).json(await listDatasources());
  })
);

datasourceRouter.get(
  '/datasource/:key',
  wrap(async (req, res) => {
    res.status(200).json(await getDatasource(param(req, 'key')));
  })
);

datasourceRouter.post(
  '/datasource/:key',
  wrap(async (req, res) => {
    const value = parseOrThrow(datasourceValue, valueBody(req.body));
    res.status(201).json(await createDatasource(param(req, 'key'), value));
  })
);

datasourceRouter.put(
  '/datasource/:key',
  wrap(async (req, res) => {
    const value = parseOrThrow(datasourceValue, valueBody(req.body));
    res.status(200).json(await putDatasource(param(req, 'key'), value));
  })
);

datasourceRouter.delete(
  '/datasource/:key',
  wrap(async (req, res) => {
    await deleteDatasource(param(req, 'key'));
    res.status(204).send();
  })
);

datasourceRouter.post('/datasource/:key/test', testDatasourceHandler);
