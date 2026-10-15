import { Router } from 'express';
import { SLICES } from '../config/slices';
import {
  getAllConfigurations,
  getSlice,
} from '../controllers/configuration.controller';
import { param, validateKeyParams, wrap } from './params';

/** PUBLIC reads (storefronts): mount before the auth gate. */
export const configurationReadRouter = Router();
validateKeyParams(configurationReadRouter);

for (const path of ['configuration', 'configurations']) {
  configurationReadRouter.get(
    `/:businessUnitKey/${path}`,
    wrap(async (req, res) => {
      res.status(200).json(await getAllConfigurations(param(req, 'businessUnitKey')));
    })
  );
}

for (const slice of SLICES) {
  configurationReadRouter.get(
    `/:businessUnitKey/configuration/${slice.path}`,
    wrap(async (req, res) => {
      res.status(200).json(await getSlice(param(req, 'businessUnitKey'), slice));
    })
  );
}
