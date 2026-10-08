import { v4 as uuidv4 } from 'uuid';
import { CustomObjectController } from './custom-object.controller';
import CustomError from '../errors/custom.error';
import { AuthenticatedRequest } from '../types/service.types';

interface GenericContentItemVersion {
  key: string;
  businessUnitKey: string;
  versions: Array<any>;
}

export interface ContentVersionControllerDependencies {
  CONTENT_VERSION_CONTAINER: string;
  MAX_VERSIONS: number;
}

// Internal function that accepts dependencies
const _getContentVersions = async <T extends GenericContentItemVersion>(
  dependencies: ContentVersionControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<T> => {
  const contentVersionController = new CustomObjectController(
    req,
    dependencies.CONTENT_VERSION_CONTAINER
  );
  try {
    const versionKey = `${businessUnitKey}_${key}`;

    const contentVersions =
      await contentVersionController.getCustomObject(versionKey);
    return contentVersions.value;
  } catch (error) {
    if ((error as any).statusCode === 404) {
      return {
        key,
        businessUnitKey,
        versions: [] as Array<any>,
      } as T;
    } else {
      throw new CustomError(500, 'Failed to get versions');
    }
  }
};

// Internal function that accepts dependencies
// TODO: Remove
const _getContentVersion = async <T extends GenericContentItemVersion>(
  dependencies: ContentVersionControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  versionId: string
): Promise<T> => {
  const versions = await _getContentVersions<T>(
    dependencies,
    req,
    businessUnitKey,
    key
  );
  return versions.versions.find((version) => version.id === versionId);
};

// Internal function that accepts dependencies
const _createContentVersion = async <T extends GenericContentItemVersion>(
  dependencies: ContentVersionControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string,
  value: any
): Promise<T> => {
  const versionKey = `${businessUnitKey}_${key}`;
  const existingVersions = await _getContentVersions(
    dependencies,
    req,
    businessUnitKey,
    key
  );

  const newVersion = {
    ...value,
    timestamp: new Date().toISOString(),
    id: uuidv4(),
  };

  existingVersions.versions.unshift(newVersion);

  const contentVersionController = new CustomObjectController(
    req,
    dependencies.CONTENT_VERSION_CONTAINER
  );

  if (existingVersions.versions.length > dependencies.MAX_VERSIONS) {
    existingVersions.versions = existingVersions.versions.slice(
      0,
      dependencies.MAX_VERSIONS
    );
  }
  const contentVersion = await contentVersionController.updateCustomObject(
    versionKey,
    existingVersions
  );
  return contentVersion.value;
};

// Internal function that accepts dependencies
const _deleteVersions = async (
  dependencies: ContentVersionControllerDependencies,
  req: AuthenticatedRequest,
  businessUnitKey: string,
  key: string
): Promise<void> => {
  const versionKey = `${businessUnitKey}_${key}`;
  const contentVersionController = new CustomObjectController(
    req,
    dependencies.CONTENT_VERSION_CONTAINER
  );
  await contentVersionController.deleteCustomObject(versionKey);
};

// Higher-order function that injects dependencies
export const withDependencies = <T extends GenericContentItemVersion>(
  dependencies: ContentVersionControllerDependencies
) => ({
  getContentVersions: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string
  ) => _getContentVersions<T>(dependencies, req, businessUnitKey, key),

  getContentVersion: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string,
    versionId: string
  ) =>
    _getContentVersion<T>(dependencies, req, businessUnitKey, key, versionId),

  createContentVersion: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string,
    value: any
  ) => _createContentVersion<T>(dependencies, req, businessUnitKey, key, value),

  deleteVersions: (
    req: AuthenticatedRequest,
    businessUnitKey: string,
    key: string
  ) => _deleteVersions(dependencies, req, businessUnitKey, key),
});
