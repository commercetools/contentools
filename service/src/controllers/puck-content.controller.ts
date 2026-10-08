import { v4 as uuidv4 } from 'uuid';
import {
  MAX_VERSIONS,
  PUCK_CONTENT_CONTAINER,
  PUCK_CONTENT_STATE_CONTAINER,
  PUCK_CONTENT_VERSION_CONTAINER,
} from '../constants';
import CustomError from '../errors/custom.error';
import { withDependencies as withContentStateDependencies } from './content-state-controller';
import { withDependencies as withContentVersionDependencies } from './content-version-controller';
import { CustomObjectController } from './custom-object.controller';
import { AuthenticatedRequest } from '../types/service.types';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PuckContentMeta {
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface PuckContentValue {
  key: string;
  businessUnitKey: string;
  name: string;
  contentType: string;
  data: Record<string, unknown>;
  meta?: PuckContentMeta;
  createdAt: string;
  updatedAt: string;
}

export interface PuckContent {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckContentValue;
}

export interface PuckContentWithStates extends PuckContent {
  states: PuckContentState['states'];
}

export interface PuckContentState {
  key: string;
  businessUnitKey: string;
  states: {
    draft?: PuckContentValue;
    published?: PuckContentValue;
  };
}

export interface PuckContentVersionEntry extends PuckContentValue {
  id: string;
  timestamp: string;
}

export interface PuckContentVersion {
  key: string;
  businessUnitKey: string;
  versions: PuckContentVersionEntry[];
}

// ---------------------------------------------------------------------------
// State & version controllers (reuse existing factories)
// ---------------------------------------------------------------------------

const PuckContentStateController = withContentStateDependencies<PuckContentState>({
  CONTENT_CONTAINER: PUCK_CONTENT_CONTAINER,
  CONTENT_STATE_CONTAINER: PUCK_CONTENT_STATE_CONTAINER,
});

const PuckContentVersionController =
  withContentVersionDependencies<PuckContentVersion>({
    CONTENT_VERSION_CONTAINER: PUCK_CONTENT_VERSION_CONTAINER,
    MAX_VERSIONS: MAX_VERSIONS,
  });

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const now = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Public controller functions
// ---------------------------------------------------------------------------

export const getPuckContents = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  contentType?: string
): Promise<PuckContentWithStates[]> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);

  const whereClauseBase = contentType
    ? `value(businessUnitKey = "${businessUnitKey}" AND contentType = "${contentType}")`
    : `value(businessUnitKey = "${businessUnitKey}")`;

  const contents = await controller.getCustomObjects(whereClauseBase);

  const stateWhereClause = contents
    .map((c) => `(key = "${c.key}" AND businessUnitKey = "${businessUnitKey}")`)
    .join(' OR ');

  const contentStates = stateWhereClause
    ? await PuckContentStateController.getContentStatesWithWhereClause(
        req,
        stateWhereClause
      )
    : [];

  return contents.map((content) => {
    const stateObj = contentStates.find((s) => s.key === content.key);
    return {
      ...content,
      states: stateObj?.states ?? {},
    };
  });
};

export const getPuckContentWithStates = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentWithStates> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);
  const content = await controller.getCustomObject(key);

  const stateKey = `${businessUnitKey}_${key}`;
  let states: PuckContentState['states'] = {};
  try {
    const stateObj =
      await PuckContentStateController.getState(req, stateKey);
    states = stateObj.states;
  } catch (err) {
    if ((err as any).statusCode !== 404) throw err;
  }

  return { ...content, states };
};

export const createPuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  input: Pick<PuckContentValue, 'name' | 'contentType'> &
    Partial<Pick<PuckContentValue, 'data' | 'meta'>>
): Promise<PuckContent> => {
  const key = `puck-content-${uuidv4()}`;
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);

  if (!input.name) throw new CustomError(400, 'name is required');
  if (!input.contentType) throw new CustomError(400, 'contentType is required');

  const value: PuckContentValue = {
    key,
    businessUnitKey,
    name: input.name,
    contentType: input.contentType,
    data: input.data ?? {},
    meta: input.meta,
    createdAt: now(),
    updatedAt: now(),
  };

  const object = await controller.createCustomObject(key, value);

  await PuckContentStateController.createDraftState(
    req,
    businessUnitKey,
    key,
    value
  );
  await PuckContentVersionController.createContentVersion(
    req,
    businessUnitKey,
    key,
    value
  );

  return object;
};

export const updatePuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  input: Partial<Pick<PuckContentValue, 'name' | 'contentType' | 'data' | 'meta'>>
): Promise<PuckContent> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);
  const existing = await controller.getCustomObject(key);

  const value: PuckContentValue = {
    ...existing.value,
    ...input,
    businessUnitKey,
    key,
    updatedAt: now(),
  };

  const object = await controller.updateCustomObject(key, value);

  await PuckContentStateController.createDraftState(
    req,
    businessUnitKey,
    key,
    value
  );
  await PuckContentVersionController.createContentVersion(
    req,
    businessUnitKey,
    key,
    value
  );

  return object;
};

export const deletePuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);
  await controller.deleteCustomObject(key);
  await PuckContentStateController.deleteStates(req, businessUnitKey, key);
  await PuckContentVersionController.deleteVersions(req, businessUnitKey, key);
};

export const getPublishedPuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentValue | undefined> => {
  return PuckContentStateController.getFirstContentWithState<PuckContentValue>(
    req,
    `key = "${key}" AND businessUnitKey = "${businessUnitKey}"`,
    'published'
  );
};

export const getPreviewPuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentValue | undefined> => {
  return PuckContentStateController.getFirstContentWithState<PuckContentValue>(
    req,
    `key = "${key}" AND businessUnitKey = "${businessUnitKey}"`,
    ['draft', 'published']
  );
};

export const queryPuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  query: string,
  state: string | string[]
): Promise<PuckContentValue | undefined> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);

  const contents = await controller.getCustomObjects(
    `value(${query} AND businessUnitKey = "${businessUnitKey}")`
  );

  if (contents.length === 0) return undefined;

  return PuckContentStateController.getFirstContentWithState<PuckContentValue>(
    req,
    `key = "${contents[0].key}" AND businessUnitKey = "${businessUnitKey}"`,
    state
  );
};

export const getPuckContentVersions = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentVersion> => {
  return PuckContentVersionController.getContentVersions(
    req,
    businessUnitKey,
    key
  );
};

export const getPuckContentStates = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentState> => {
  const stateKey = `${businessUnitKey}_${key}`;
  try {
    return await PuckContentStateController.getState(req, stateKey);
  } catch (err) {
    if ((err as any).statusCode === 404) {
      return { key, businessUnitKey, states: {} };
    }
    throw err;
  }
};

export const publishPuckContent = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  clearDraft?: boolean
): Promise<PuckContentState> => {
  const controller = new CustomObjectController(req, PUCK_CONTENT_CONTAINER);
  const content = await controller.getCustomObject(key);
  return PuckContentStateController.createPublishedState(
    req,
    businessUnitKey,
    key,
    content.value,
    clearDraft
  );
};

export const revertPuckContentDraft = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<PuckContentState> => {
  return PuckContentStateController.deleteDraftState(req, businessUnitKey, key);
};
