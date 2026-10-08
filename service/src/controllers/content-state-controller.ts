import { CustomObjectController } from './custom-object.controller';
import CustomError from '../errors/custom.error';
import { AuthenticatedRequest } from '../types/service.types';

interface GenericState {
  key: string;
  businessUnitKey: string;
  states: Record<string, any>;
}

export interface StateControllerDependencies {
  CONTENT_CONTAINER: string;
  CONTENT_STATE_CONTAINER: string;
}

// Internal function that accepts dependencies
const _getContentStatesWithWhereClause = async <T>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  whereClause: string,
  expand?: string[]
): Promise<T[]> => {
  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  const contentStates = await contentStateController.getCustomObjects(
    `value(${whereClause})`,
    expand
  );
  return contentStates.map((state) => state.value);
};

const _getFirstContentWithState = async <T extends GenericState, R>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  whereClause: string,
  stateKey: string | string[],
  expand?: string[]
): Promise<R | undefined> => {
  const contentStates = await _getContentStatesWithWhereClause<T>(
    dependencies,
    req,
    whereClause,
    expand
  );
  if (contentStates.length > 0) {
    if (Array.isArray(stateKey)) {
      for (const state of stateKey) {
        if (contentStates[0].states[state]) {
          return contentStates[0].states[state];
        }
      }
    } else {
      if (contentStates[0].states[stateKey]) {
        return contentStates[0].states[stateKey];
      }
    }
  }
  return undefined;
};

// Internal function that accepts dependencies
const _getState = async <T>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  key: string
): Promise<T> => {
  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  const contentState = await contentStateController.getCustomObject(key);
  return contentState.value;
};

// Internal function that accepts dependencies
const _createDraftState = async <T extends GenericState>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  value: any
): Promise<T> => {
  const stateKey = `${businessUnitKey}_${key}`;
  let existingState: T;
  try {
    existingState = await _getState(dependencies, req, stateKey);
  } catch (error) {
    if ((error as any).statusCode === 404) {
      existingState = {
        key,
        businessUnitKey,
        states: {},
      } as T;
    } else {
      throw new CustomError(500, 'Failed to create draft state');
    }
  }

  const contentItemController = new CustomObjectController(
    req,
    dependencies.CONTENT_CONTAINER
  );

  const existingContent = await contentItemController.getCustomObject(key);
  existingState.states = {
    ...existingState.states,
    draft: {
      ...(existingContent?.value ?? {}),
      ...value,
    },
  };

  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  const contentState = await contentStateController.updateCustomObject(
    stateKey,
    existingState
  );
  return contentState.value;
};

// Internal function that accepts dependencies
const _createPublishedState = async <T extends GenericState>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  value: any,
  clear?: boolean
): Promise<T> => {
  const stateKey = `${businessUnitKey}_${key}`;
  let existingState: T;
  try {
    existingState = await _getState(dependencies, req, stateKey);
  } catch (error) {
    if ((error as any).statusCode === 404) {
      existingState = {
        key,
        businessUnitKey,
        states: {},
      } as T;
    } else {
      throw new CustomError(500, 'Failed to create published state');
    }
  }
  const contentItemController = new CustomObjectController(
    req,
    dependencies.CONTENT_CONTAINER
  );
  const existingContent = await contentItemController.getCustomObject(key);
  existingState.states = {
    ...existingState.states,
    published: {
      ...(existingContent?.value ?? {}),
      ...value,
    },
  };
  if (clear) {
    existingState.states = {
      ...existingState.states,
      draft: undefined,
    };
  }

  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  const contentState = await contentStateController.updateCustomObject(
    stateKey,
    existingState
  );
  return contentState.value;
};

// Internal function that accepts dependencies
const _deleteDraftState = async <T extends GenericState>(
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<T> => {
  const stateKey = `${businessUnitKey}_${key}`;
  let existingState: T;
  try {
    existingState = await _getState(dependencies, req, stateKey);
  } catch (error) {
    if ((error as any).statusCode === 404) {
      existingState = {
        key,
        businessUnitKey,
        states: {},
      } as T;
    } else {
      throw new CustomError(500, 'Failed to delete draft state');
    }
  }

  if (!existingState.states.published) {
    throw new CustomError(404, 'No published state found');
  }

  existingState.states = {
    ...existingState.states,
    draft: undefined,
  };

  const contentItemController = new CustomObjectController(
    req,
    dependencies.CONTENT_CONTAINER
  );

  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  await contentItemController.updateCustomObject(key, {
    ...existingState.states.published,
    businessUnitKey,
  });

  const contentState = await contentStateController.updateCustomObject(
    stateKey,
    existingState
  );
  return contentState.value;
};

// Internal function that accepts dependencies
const _deleteStates = async (
  dependencies: StateControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  const stateKey = `${businessUnitKey}_${key}`;
  const contentStateController = new CustomObjectController(
    req,
    dependencies.CONTENT_STATE_CONTAINER
  );
  await contentStateController.deleteCustomObject(stateKey);
};

// Higher-order function that injects dependencies
export const withDependencies = <T extends GenericState>(
  dependencies: StateControllerDependencies
) => ({
  getContentStatesWithWhereClause: (
    req: AuthenticatedRequest,
    whereClause: string,
    expand?: string[]
  ) =>
    _getContentStatesWithWhereClause<T>(dependencies, req, whereClause, expand),

  getFirstContentWithState: <R>(
    req: AuthenticatedRequest,
    whereClause: string,
    stateKey: string | string[],
    expand?: string[]
  ) =>
    _getFirstContentWithState<T, R>(
      dependencies,
      req,
      whereClause,
      stateKey,
      expand
    ),

  getState: (req: AuthenticatedRequest, key: string) =>
    _getState<T>(dependencies, req, key),

  createDraftState: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string,
    value: any
  ) => _createDraftState<T>(dependencies, req, businessUnitKey, key, value),

  createPublishedState: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string,
    value: any,
    clear?: boolean
  ) =>
    _createPublishedState<T>(
      dependencies,
      req,
      businessUnitKey,
      key,
      value,
      clear
    ),

  deleteDraftState: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string
  ) => _deleteDraftState<T>(dependencies, req, businessUnitKey, key),

  deleteStates: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string
  ) => _deleteStates(dependencies, req, businessUnitKey, key),
});
