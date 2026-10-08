import { Router } from 'express';
import configurationRouter from './configuration.route';
import contentItemStateRouter from './content-item-state.route';
import contentItemVersionRouter from './content-item-version.route';
import contentItemRouter from './content-item.route';
import contentTypeRouter from './content-type.route';
import datasourceRouter from './datasource.route';
import fileRouter from './file.route';
import pageComponentRouter from './page-component.route';
import pageRowRouter from './page-row.route';
import pageStateRouter from './page-state.route';
import pageVersionRouter from './page-version.route';
import pagesRouter from './pages.route';
import productRouter from './product.route';
import proxyRouter from './proxy.route';
import pageContentItemStateRouter from './page-content-item-state.route';
import authRouter from './auth.route';
import puckPageRouter from './puck-page.route';
import puckContentRouter from './puck-content.route';
import puckTemplateRouter from './puck-template.route';
import { deprecationMiddleware } from '../middleware/deprecation.middleware';

const serviceRouter = Router();

// Flags the legacy content-items / grid-based pages APIs (superseded by the
// Puck APIs) with deprecation headers + log warnings on every request.
serviceRouter.use(deprecationMiddleware);

serviceRouter.use('/', configurationRouter);
serviceRouter.use('/', contentTypeRouter);
serviceRouter.use('/', contentItemRouter);
serviceRouter.use('/', fileRouter);
serviceRouter.use('/', datasourceRouter);
serviceRouter.use('/', productRouter);
serviceRouter.use('/', proxyRouter);
serviceRouter.use('/', contentItemVersionRouter);
serviceRouter.use('/', contentItemStateRouter);
serviceRouter.use('/', pageContentItemStateRouter);
serviceRouter.use('/', pageComponentRouter);
serviceRouter.use('/', pageVersionRouter);
serviceRouter.use('/', pageStateRouter);
serviceRouter.use('/', pageRowRouter);
serviceRouter.use('/', pagesRouter);
serviceRouter.use('/', authRouter);
serviceRouter.use('/', puckPageRouter);
serviceRouter.use('/', puckContentRouter);
serviceRouter.use('/', puckTemplateRouter);

export default serviceRouter;
