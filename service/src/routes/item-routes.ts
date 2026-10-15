import { Router, type Request } from 'express';
import type { z } from 'zod';
import CustomError from '../errors/custom.error';
import { parseOrThrow, valueBody } from '../schemas/common';
import { queryBody } from '../schemas/query';
import type { ItemStore } from '../services/item-store';
import type { ItemValue } from '../types/content';
import { param, validateKeyParams, wrap } from './params';

export interface ItemRouteDef<V extends ItemValue, C, U> {
  path: 'puck-pages' | 'puck-contents';
  store: ItemStore<V, C, U>;
  createSchema: z.ZodType<C>;
  updateSchema: z.ZodType<U>;
  listFilter?: (req: Request) => Record<string, string | undefined>;
  messages: { publishedNotFound: string; previewNotFound: string };
}

/**
 * Registers the 13 routes of one content type into two routers: the public
 * one (published reads, mounted before the gate) and the protected one (the rest).
 */
export function buildItemRouters<V extends ItemValue, C, U>(
  def: ItemRouteDef<V, C, U>
): { publicRouter: Router; protectedRouter: Router } {
  const { store, path, messages } = def;
  const bu = (req: Request): string => param(req, 'businessUnitKey');
  const key = (req: Request): string => param(req, 'key');

  const publicRouter = Router();
  validateKeyParams(publicRouter);

  publicRouter.post(
    `/:businessUnitKey/published/${path}/query`,
    wrap(async (req, res) => {
      const { query } = parseOrThrow(queryBody, req.body);
      const found = await store.query(bu(req), query, 'published');
      if (!found) {
        throw new CustomError(404, messages.publishedNotFound);
      }
      res.status(200).json(found);
    })
  );

  publicRouter.get(
    `/:businessUnitKey/published/${path}/:key`,
    wrap(async (req, res) => {
      const found = await store.published(bu(req), key(req));
      if (!found) {
        throw new CustomError(404, messages.publishedNotFound);
      }
      res.status(200).json(found);
    })
  );

  const protectedRouter = Router();
  validateKeyParams(protectedRouter);

  protectedRouter.post(
    `/:businessUnitKey/preview/${path}/query`,
    wrap(async (req, res) => {
      const { query } = parseOrThrow(queryBody, req.body);
      const found = await store.query(bu(req), query, 'preview');
      if (!found) {
        throw new CustomError(404, messages.previewNotFound);
      }
      res.status(200).json(found);
    })
  );

  protectedRouter.get(
    `/:businessUnitKey/preview/${path}/:key`,
    wrap(async (req, res) => {
      const found = await store.preview(bu(req), key(req));
      if (!found) {
        throw new CustomError(404, messages.previewNotFound);
      }
      res.status(200).json(found);
    })
  );

  protectedRouter.get(
    `/:businessUnitKey/${path}`,
    wrap(async (req, res) => {
      res.status(200).json(await store.list(bu(req), def.listFilter?.(req)));
    })
  );

  protectedRouter.post(
    `/:businessUnitKey/${path}`,
    wrap(async (req, res) => {
      const input = parseOrThrow(def.createSchema, valueBody(req.body));
      res.status(201).json(await store.create(bu(req), input));
    })
  );

  protectedRouter.get(
    `/:businessUnitKey/${path}/:key/states`,
    wrap(async (req, res) => {
      res.status(200).json(await store.states(bu(req), key(req)));
    })
  );

  protectedRouter.put(
    `/:businessUnitKey/${path}/:key/states/published`,
    wrap(async (req, res) => {
      const clearDraft = req.query.clearDraft === 'true';
      res.status(200).json(await store.publish(bu(req), key(req), clearDraft));
    })
  );

  protectedRouter.delete(
    `/:businessUnitKey/${path}/:key/states/draft`,
    wrap(async (req, res) => {
      res.status(200).json(await store.revertDraft(bu(req), key(req)));
    })
  );

  protectedRouter.get(
    `/:businessUnitKey/${path}/:key/versions`,
    wrap(async (req, res) => {
      res.status(200).json(await store.versions(bu(req), key(req)));
    })
  );

  protectedRouter.get(
    `/:businessUnitKey/${path}/:key`,
    wrap(async (req, res) => {
      res.status(200).json(await store.getWithStates(bu(req), key(req)));
    })
  );

  protectedRouter.put(
    `/:businessUnitKey/${path}/:key`,
    wrap(async (req, res) => {
      const input = parseOrThrow(def.updateSchema, valueBody(req.body));
      res.status(200).json(await store.update(bu(req), key(req), input));
    })
  );

  protectedRouter.delete(
    `/:businessUnitKey/${path}/:key`,
    wrap(async (req, res) => {
      await store.remove(bu(req), key(req));
      res.status(204).send();
    })
  );

  return { publicRouter, protectedRouter };
}
