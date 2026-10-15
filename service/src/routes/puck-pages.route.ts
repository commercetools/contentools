import { pageStore } from '../controllers/puck-pages.controller';
import { pageCreate, pageUpdate } from '../schemas/pages';
import { buildItemRouters } from './item-routes';

const { publicRouter, protectedRouter } = buildItemRouters({
  path: 'puck-pages',
  store: pageStore,
  createSchema: pageCreate,
  updateSchema: pageUpdate,
  messages: {
    publishedNotFound: 'Published puck page not found',
    previewNotFound: 'Puck page not found',
  },
});

export const publishedPagesRouter = publicRouter;
export const puckPagesRouter = protectedRouter;
