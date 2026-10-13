/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
} from '../controllers/puck-templates.controller';
import { parseOrThrow, valueBody } from '../schemas/common';
import { templateCreate } from '../schemas/templates';
import { param, validateKeyParams, wrap } from './params';

export const puckTemplatesRouter = Router();
validateKeyParams(puckTemplatesRouter);

puckTemplatesRouter.get(
  '/:businessUnitKey/puck-templates',
  wrap(async (req, res) => {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    res.status(200).json(await listTemplates(param(req, 'businessUnitKey'), kind));
  })
);

puckTemplatesRouter.get(
  '/:businessUnitKey/puck-templates/:key',
  wrap(async (req, res) => {
    res
      .status(200)
      .json(await getTemplate(param(req, 'businessUnitKey'), param(req, 'key')));
  })
);

puckTemplatesRouter.post(
  '/:businessUnitKey/puck-templates',
  wrap(async (req, res) => {
    const input = parseOrThrow(templateCreate, valueBody(req.body));
    res.status(201).json(await createTemplate(param(req, 'businessUnitKey'), input));
  })
);

puckTemplatesRouter.delete(
  '/:businessUnitKey/puck-templates/:key',
  wrap(async (req, res) => {
    await deleteTemplate(param(req, 'businessUnitKey'), param(req, 'key'));
    res.status(204).send();
  })
);
