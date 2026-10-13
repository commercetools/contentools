/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import express from 'express';

const PAGE = {
  key: 'home',
  value: { name: 'Home', slug: '/home', puckData: { content: [], root: {} } },
};

/** A tiny in-memory stand-in for the content service routes the MCP tools call. */
export function buildFakeService(token: string): express.Express {
  const app = express();
  app.use(express.json());
  const base = express.Router();

  const bearer: express.RequestHandler = (req, res, next) => {
    if (req.header('authorization') !== `Bearer ${token}`) {
      res.status(401).json({ message: 'Unauthorized', statusCode: 401, correlationId: 'fake-0001' });
      return;
    }
    next();
  };

  base.get('/health', (_q, r) => void r.json({ status: 'healthy' }));
  base.get('/products/search', bearer, (q, r) =>
    void r.json({ results: [{ id: 'p1', name: q.query.text }] })
  );
  base.get('/:bu/puck-pages', (_q, r) => void r.json([PAGE]));
  base.get('/:bu/puck-pages/:key', (q, r) =>
    q.params.key === PAGE.key ? void r.json(PAGE) : void r.status(404).json({ message: 'Page not found' })
  );
  base.get('/:bu/published/puck-pages/:key', (q, r) =>
    q.params.key === PAGE.key ? void r.json(PAGE) : void r.status(404).json({ message: 'Page not found' })
  );
  base.get('/:bu/preview/puck-pages/:key', bearer, (q, r) =>
    q.params.key === PAGE.key ? void r.json(PAGE) : void r.status(404).json({ message: 'Page not found' })
  );
  base.post('/:bu/published/puck-pages/query', (_q, r) => void r.json([PAGE]));
  base.post('/:bu/puck-pages', bearer, (q, r) =>
    void r.status(201).json({ key: 'new-page', value: (q.body as { value?: unknown }).value })
  );
  base.get('/:bu/configuration/theme', (_q, r) => void r.json({ primary: '#0a0' }));
  base.get('/:bu/media-library', bearer, (q, r) => {
    const first = q.query.cursor === undefined;
    r.json({
      files: [{ key: first ? 'a.png' : 'b.png', url: 'https://cdn.example/x.png' }],
      pagination: { limit: 1, nextCursor: first ? 'c2' : null, hasMore: first },
    });
  });
  base.use((_q, r) => void r.status(404).json({ message: 'Path not found.' }));
  app.use('/service', base);
  return app;
}
