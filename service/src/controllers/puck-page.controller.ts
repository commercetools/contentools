import { v4 as uuidv4 } from 'uuid';
import {
  MAX_VERSIONS,
  PUCK_PAGE_CONTAINER,
  PUCK_PAGE_STATE_CONTAINER,
  PUCK_PAGE_VERSION_CONTAINER,
} from '../constants';
import CustomError from '../errors/custom.error';
import { withDependencies as withContentStateDependencies } from './content-state-controller';
import { withDependencies as withContentVersionDependencies } from './content-version-controller';
import { CustomObjectController } from './custom-object.controller';
import { AuthenticatedRequest } from '../types/service.types';
import { resolveDatasource } from './datasource-resolution.route';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PuckComponentData {
  type: string;
  props: { id: string } & Record<string, unknown>;
}

export interface PuckData {
  content: PuckComponentData[];
  root: { props: Record<string, unknown> };
  zones?: Record<string, PuckComponentData[]>;
}

export interface PuckPageMeta {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface PuckPageValue {
  key: string;
  businessUnitKey: string;
  name: string;
  slug: string;
  puckData: PuckData;
  meta?: PuckPageMeta;
  createdAt: string;
  updatedAt: string;
}

export interface PuckPage {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckPageValue;
}

export interface PuckPageWithStates extends PuckPage {
  states: PuckPageState['states'];
}

export interface PuckPageState {
  key: string;
  businessUnitKey: string;
  states: {
    draft?: PuckPageValue;
    published?: PuckPageValue;
  };
}

export interface PuckPageVersionEntry extends PuckPageValue {
  id: string;
  timestamp: string;
}

export interface PuckPageVersion {
  key: string;
  businessUnitKey: string;
  versions: PuckPageVersionEntry[];
}

// ---------------------------------------------------------------------------
// State & version controllers (reuse existing factories)
// ---------------------------------------------------------------------------

const PuckPageStateController = withContentStateDependencies<PuckPageState>({
  CONTENT_CONTAINER: PUCK_PAGE_CONTAINER,
  CONTENT_STATE_CONTAINER: PUCK_PAGE_STATE_CONTAINER,
});

const PuckPageVersionController =
  withContentVersionDependencies<PuckPageVersion>({
    CONTENT_VERSION_CONTAINER: PUCK_PAGE_VERSION_CONTAINER,
    MAX_VERSIONS: MAX_VERSIONS,
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = (): string => new Date().toISOString();

const isDatasourceValue = (
  v: unknown
): v is { type: string; skus: string[] } =>
  typeof v === 'object' &&
  v !== null &&
  'type' in v &&
  'skus' in v &&
  Array.isArray((v as Record<string, unknown>).skus);

const resolveComponentProps = async (
  req: AuthenticatedRequest,
  props: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const resolved: Record<string, unknown> = { ...props };
  for (const [key, value] of Object.entries(props)) {
    if (isDatasourceValue(value)) {
      const skus = (value.skus as string[]).filter(Boolean);
      if (skus.length === 0) continue;
      const params =
        value.type === 'product-by-sku'
          ? { sku: skus[0] }
          : { skus: skus.join(',') };
      const data = await resolveDatasource(req, value.type, params);
      resolved[key] = { ...value, resolvedData: data };
    }
  }
  return resolved;
};

/**
 * Walk all Puck components (content + zones) and resolve any datasource props
 * in-place, injecting `resolvedData` alongside the original datasource config.
 */
const resolvePuckPageDatasources = async (
  req: AuthenticatedRequest,
  pageValue: PuckPageValue
): Promise<PuckPageValue> => {
  const resolveComponents = async (
    components: PuckComponentData[]
  ): Promise<PuckComponentData[]> =>
    Promise.all(
      components.map(async (component) => ({
        ...component,
        props: (await resolveComponentProps(
          req,
          component.props
        )) as PuckComponentData['props'],
      }))
    );

  const content = await resolveComponents(pageValue.puckData.content);

  const zones: Record<string, PuckComponentData[]> = {};
  if (pageValue.puckData.zones) {
    for (const [zone, components] of Object.entries(pageValue.puckData.zones)) {
      zones[zone] = await resolveComponents(components);
    }
  }

  return {
    ...pageValue,
    puckData: {
      ...pageValue.puckData,
      content,
      ...(pageValue.puckData.zones ? { zones } : {}),
    },
  };
};

// ---------------------------------------------------------------------------
// Public controller functions
// ---------------------------------------------------------------------------

export const getPuckPages = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<PuckPageWithStates[]> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);

  const pages = await controller.getCustomObjects(
    `value(businessUnitKey = "${businessUnitKey}")`
  );

  const whereClause = pages
    .map((p) => `(key = "${p.key}" AND businessUnitKey = "${businessUnitKey}")`)
    .join(' OR ');

  const pageStates = whereClause
    ? await PuckPageStateController.getContentStatesWithWhereClause(
        req,
        whereClause
      )
    : [];

  return pages.map((page) => {
    const stateObj = pageStates.find((s) => s.key === page.key);
    return {
      ...page,
      states: stateObj?.states ?? {},
    };
  });
};

export const getPuckPageWithStates = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageWithStates> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);
  const page = await controller.getCustomObject(key);

  const stateKey = `${businessUnitKey}_${key}`;
  let states: PuckPageState['states'] = {};
  try {
    const stateObj =
      await PuckPageStateController.getState(req, stateKey);
    states = stateObj.states;
  } catch (err) {
    if ((err as any).statusCode !== 404) throw err;
  }

  return { ...page, states };
};

export const createPuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  input: Pick<PuckPageValue, 'name' | 'slug'> &
    Partial<Pick<PuckPageValue, 'puckData' | 'meta'>>
): Promise<PuckPage> => {
  const key = `puck-page-${uuidv4()}`;
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);

  if (!input.name) throw new CustomError(400, 'name is required');
  if (!input.slug) throw new CustomError(400, 'slug is required');

  const emptyPuckData: PuckData = {
    content: [],
    root: { props: {} },
  };

  const value: PuckPageValue = {
    key,
    businessUnitKey,
    name: input.name,
    slug: input.slug,
    puckData: input.puckData ?? emptyPuckData,
    meta: input.meta,
    createdAt: now(),
    updatedAt: now(),
  };

  const object = await controller.createCustomObject(key, value);

  await PuckPageStateController.createDraftState(
    req,
    businessUnitKey,
    key,
    value
  );
  await PuckPageVersionController.createContentVersion(
    req,
    businessUnitKey,
    key,
    value
  );

  return object;
};

export const updatePuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  input: Partial<Pick<PuckPageValue, 'name' | 'slug' | 'puckData' | 'meta'>>
): Promise<PuckPage> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);
  const existing = await controller.getCustomObject(key);

  const value: PuckPageValue = {
    ...existing.value,
    ...input,
    businessUnitKey,
    key,
    updatedAt: now(),
  };

  const object = await controller.updateCustomObject(key, value);

  await PuckPageStateController.createDraftState(
    req,
    businessUnitKey,
    key,
    value
  );
  await PuckPageVersionController.createContentVersion(
    req,
    businessUnitKey,
    key,
    value
  );

  return object;
};

export const deletePuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);
  await controller.deleteCustomObject(key);
  await PuckPageStateController.deleteStates(req, businessUnitKey, key);
  await PuckPageVersionController.deleteVersions(req, businessUnitKey, key);
};

export const getPublishedPuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageValue | undefined> => {
  const pageValue =
    await PuckPageStateController.getFirstContentWithState<PuckPageValue>(
      req,
      `key = "${key}" AND businessUnitKey = "${businessUnitKey}"`,
      'published'
    );
  if (!pageValue) return undefined;
  return resolvePuckPageDatasources(req, pageValue);
};

export const getPreviewPuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageValue | undefined> => {
  const pageValue =
    await PuckPageStateController.getFirstContentWithState<PuckPageValue>(
      req,
      `key = "${key}" AND businessUnitKey = "${businessUnitKey}"`,
      ['draft', 'published']
    );
  if (!pageValue) return undefined;
  return resolvePuckPageDatasources(req, pageValue);
};

export const queryPuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  query: string,
  state: string | string[]
): Promise<PuckPageValue | undefined> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);

  const pages = await controller.getCustomObjects(
    `value(${query} AND businessUnitKey = "${businessUnitKey}")`
  );

  if (pages.length === 0) return undefined;

  const pageValue =
    await PuckPageStateController.getFirstContentWithState<PuckPageValue>(
      req,
      `key = "${pages[0].key}" AND businessUnitKey = "${businessUnitKey}"`,
      state
    );
  if (!pageValue) return undefined;
  return resolvePuckPageDatasources(req, pageValue);
};

export const getPuckPageVersions = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageVersion> => {
  return PuckPageVersionController.getContentVersions(
    req,
    businessUnitKey,
    key
  );
};

export const getPuckPageStates = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageState> => {
  const stateKey = `${businessUnitKey}_${key}`;
  try {
    return await PuckPageStateController.getState(req, stateKey);
  } catch (err) {
    if ((err as any).statusCode === 404) {
      return { key, businessUnitKey, states: {} };
    }
    throw err;
  }
};

export const publishPuckPage = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  clearDraft?: boolean
): Promise<PuckPageState> => {
  const controller = new CustomObjectController(req, PUCK_PAGE_CONTAINER);
  const page = await controller.getCustomObject(key);
  return PuckPageStateController.createPublishedState(
    req,
    businessUnitKey,
    key,
    page.value,
    clearDraft
  );
};

export const revertPuckPageDraft = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckPageState> => {
  return PuckPageStateController.deleteDraftState(req, businessUnitKey, key);
};
