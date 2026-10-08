/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import configurationRouter from './configuration.route';
import contentTypeRouter from './content-type.route';
import datasourceRouter from './datasource.route';
import fileRouter from './file.route';
import productRouter from './product.route';
import authRouter from './auth.route';
import puckPageRouter from './puck-page.route';
import puckContentRouter from './puck-content.route';
import puckTemplateRouter from './puck-template.route';

const serviceRouter = Router();

serviceRouter.use('/', configurationRouter);
serviceRouter.use('/', contentTypeRouter);
serviceRouter.use('/', fileRouter);
serviceRouter.use('/', datasourceRouter);
serviceRouter.use('/', productRouter);
serviceRouter.use('/', authRouter);
serviceRouter.use('/', puckPageRouter);
serviceRouter.use('/', puckContentRouter);
serviceRouter.use('/', puckTemplateRouter);

export default serviceRouter;
