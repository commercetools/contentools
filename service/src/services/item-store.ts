import { randomUUID } from 'node:crypto';
import type { ContainerKey } from '../config/containers';
import { getConfiguration } from '../config/env';
import { customObjects } from '../ct/custom-objects';
import CustomError from '../errors/custom.error';
import type {
  ItemState,
  ItemValue,
  ItemVersions,
  StoredObject,
  WithStates,
} from '../types/content';
import { and, eq, inValue } from '../utils/predicate';
import { parseQuery } from './query-grammar';

export interface ItemStoreOptions<V extends ItemValue, C, U> {
  /** Prefix of generated item keys, for example `puck-page-`. */
  keyPrefix: string;
  containers: { item: ContainerKey; state: ContainerKey; version: ContainerKey };
  /** Fields a `query` clause may use. */
  queryFields: readonly string[];
  /** Full value for a new item (adds timestamps). */
  build(businessUnitKey: string, key: string, input: C): V;
  /** Whitelist merge; sets `updatedAt`, keeps `key`, `businessUnitKey` and `createdAt`. */
  applyUpdate(existing: V, input: U): V;
  extraListWhere?(filter: Record<string, string | undefined>): string[];
  /** Applied to published and preview reads (pages: datasource resolution). */
  resolveRead?(value: V): Promise<V>;
}

export interface ItemStore<V extends ItemValue, C, U> {
  list(
    businessUnitKey: string,
    filter?: Record<string, string | undefined>
  ): Promise<Array<WithStates<V>>>;
  getWithStates(businessUnitKey: string, key: string): Promise<WithStates<V>>;
  create(businessUnitKey: string, input: C): Promise<StoredObject<V>>;
  update(
    businessUnitKey: string,
    key: string,
    input: U
  ): Promise<StoredObject<V>>;
  remove(businessUnitKey: string, key: string): Promise<void>;
  published(businessUnitKey: string, key: string): Promise<V | undefined>;
  preview(businessUnitKey: string, key: string): Promise<V | undefined>;
  query(
    businessUnitKey: string,
    query: string,
    mode: 'published' | 'preview'
  ): Promise<V | undefined>;
  states(businessUnitKey: string, key: string): Promise<ItemState<V>>;
  publish(
    businessUnitKey: string,
    key: string,
    clearDraft: boolean
  ): Promise<ItemState<V>>;
  revertDraft(businessUnitKey: string, key: string): Promise<ItemState<V>>;
  versions(businessUnitKey: string, key: string): Promise<ItemVersions<V>>;
}

const notFound = (): CustomError => new CustomError(404, 'Not found');

export function createItemStore<V extends ItemValue, C, U>(
  o: ItemStoreOptions<V, C, U>
): ItemStore<V, C, U> {
  // Handles are created per call: the container prefix comes from configuration.
  const items = () => customObjects(o.containers.item);
  const stateObjects = () => customObjects(o.containers.state);
  const versionObjects = () => customObjects(o.containers.version);

  const stateKey = (bu: string, key: string): string => `${bu}_${key}`;
  const emptyState = (bu: string, key: string): ItemState<V> => ({
    key,
    businessUnitKey: bu,
    states: {},
  });

  const assertOwned = (obj: StoredObject<V>, bu: string): void => {
    if (obj.value.businessUnitKey !== bu) {
      throw notFound();
    }
  };

  const readState = async (
    bu: string,
    key: string
  ): Promise<ItemState<V> | undefined> => {
    const found = await stateObjects().get(stateKey(bu, key));
    return found ? (found.value as ItemState<V>) : undefined;
  };

  const writeState = async (
    bu: string,
    key: string,
    change: (states: ItemState<V>['states']) => ItemState<V>['states']
  ): Promise<ItemState<V>> => {
    const obj = await stateObjects().update<ItemState<V>>(
      stateKey(bu, key),
      (cur) => {
        const base = cur ?? emptyState(bu, key);
        return { ...base, states: change(base.states) };
      }
    );
    return obj.value as ItemState<V>;
  };

  const setDraft = async (bu: string, key: string, value: V): Promise<void> => {
    await writeState(bu, key, (states) => ({ ...states, draft: value }));
  };

  const pushVersion = async (
    bu: string,
    key: string,
    value: V
  ): Promise<void> => {
    await versionObjects().update<ItemVersions<V>>(stateKey(bu, key), (cur) => {
      const base: ItemVersions<V> = cur ?? {
        key,
        businessUnitKey: bu,
        versions: [],
      };
      const entry = {
        ...value,
        id: randomUUID(),
        timestamp: new Date().toISOString(),
      };
      return {
        ...base,
        versions: [entry, ...base.versions].slice(
          0,
          getConfiguration().maxVersions
        ),
      };
    });
  };

  const readStateValue = async (
    bu: string,
    key: string,
    mode: 'published' | 'preview'
  ): Promise<V | undefined> => {
    const st = await readState(bu, key);
    const value =
      mode === 'published'
        ? st?.states.published
        : (st?.states.draft ?? st?.states.published);
    return value && o.resolveRead ? o.resolveRead(value) : value;
  };

  return {
    async list(bu, filter) {
      const where = inValue(
        and(eq('businessUnitKey', bu), ...(o.extraListWhere?.(filter ?? {}) ?? []))
      );
      const objs = (await items().list(where)) as unknown as Array<
        StoredObject<V>
      >;
      const stateObjs = objs.length
        ? await stateObjects().list(inValue(eq('businessUnitKey', bu)))
        : [];
      const byKey = new Map<string, ItemState<V>>();
      for (const s of stateObjs) {
        const value = s.value as ItemState<V>;
        byKey.set(value.key, value);
      }
      return objs.map((obj) => ({
        ...obj,
        states: byKey.get(obj.key)?.states ?? {},
      }));
    },

    async getWithStates(bu, key) {
      const obj = (await items().getOrThrow(key)) as unknown as StoredObject<V>;
      assertOwned(obj, bu);
      const st = await readState(bu, key);
      return { ...obj, states: st?.states ?? {} };
    },

    async create(bu, input) {
      const key = o.keyPrefix + randomUUID();
      const value = o.build(bu, key, input);
      const obj = await items().put(key, value);
      await setDraft(bu, key, value);
      await pushVersion(bu, key, value);
      return obj as unknown as StoredObject<V>;
    },

    async update(bu, key, input) {
      let updated: V | undefined;
      // Re-reads and retries on a version conflict, so concurrent saves cannot overwrite each other.
      const obj = await items().update<V>(key, (cur) => {
        if (!cur || cur.businessUnitKey !== bu) {
          throw notFound();
        }
        updated = o.applyUpdate(cur, input);
        return updated;
      });
      if (updated) {
        await setDraft(bu, key, updated);
        await pushVersion(bu, key, updated);
      }
      return obj as unknown as StoredObject<V>;
    },

    async remove(bu, key) {
      const obj = await items().get(key);
      if (!obj || (obj.value as V).businessUnitKey !== bu) {
        throw notFound();
      }
      await items().delete(key);
      await stateObjects().delete(stateKey(bu, key));
      await versionObjects().delete(stateKey(bu, key));
    },

    published: (bu, key) => readStateValue(bu, key, 'published'),
    preview: (bu, key) => readStateValue(bu, key, 'preview'),

    async query(bu, query, mode) {
      const clauses = parseQuery(query, o.queryFields);
      const found = await items().list(
        inValue(
          and(
            ...clauses.map((c) => eq(c.field, c.value)),
            eq('businessUnitKey', bu)
          )
        ),
        { limit: 1 }
      );
      const first = found[0];
      return first ? readStateValue(bu, first.key, mode) : undefined;
    },

    async states(bu, key) {
      return (await readState(bu, key)) ?? emptyState(bu, key);
    },

    async publish(bu, key, clearDraft) {
      const obj = (await items().getOrThrow(key)) as unknown as StoredObject<V>;
      assertOwned(obj, bu);
      return writeState(bu, key, (states) =>
        clearDraft
          ? { published: obj.value }
          : { ...states, published: obj.value }
      );
    },

    async revertDraft(bu, key) {
      const published = (await readState(bu, key))?.states.published;
      if (!published) {
        throw new CustomError(404, 'No published state found');
      }
      await items().update<V>(key, () => ({ ...published, businessUnitKey: bu }));
      return writeState(bu, key, (states) =>
        states.published ? { published: states.published } : {}
      );
    },

    async versions(bu, key) {
      const found = await versionObjects().get(stateKey(bu, key));
      return found
        ? (found.value as ItemVersions<V>)
        : { key, businessUnitKey: bu, versions: [] };
    },
  };
}
