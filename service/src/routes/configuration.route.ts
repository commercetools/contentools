import { Router, type Request } from 'express';
import { SLICES } from '../config/slices';
import { deleteSlice, putSlice } from '../controllers/configuration.controller';
import CustomError from '../errors/custom.error';
import { param, validateKeyParams, wrap } from './params';

/** PROTECTED writes: mount after the auth gate. */
export const configurationRouter = Router();
validateKeyParams(configurationRouter);

const bodyValue = (req: Request): unknown => {
  const value = (req.body as { value?: unknown } | undefined)?.value;
  if (value === undefined || value === null) {
    throw new CustomError(400, 'value is required in request body');
  }
  return value;
};

for (const slice of SLICES) {
  const path = `/:businessUnitKey/configuration/${slice.path}`;

  configurationRouter.post(
    path,
    wrap(async (req, res) => {
      res
        .status(201)
        .json(await putSlice(param(req, 'businessUnitKey'), slice, bodyValue(req)));
    })
  );

  configurationRouter.put(
    path,
    wrap(async (req, res) => {
      res
        .status(200)
        .json(await putSlice(param(req, 'businessUnitKey'), slice, bodyValue(req)));
    })
  );

  configurationRouter.delete(
    path,
    wrap(async (req, res) => {
      await deleteSlice(param(req, 'businessUnitKey'), slice);
      res.status(204).send();
    })
  );
}
