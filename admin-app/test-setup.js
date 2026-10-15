// src/constants.ts holds the '${env:ENTRY_POINT_URI_PATH}' placeholder that the Merchant Center tooling
// resolves from the app config; tests use the default registered path instead.
jest.mock('./src/constants', () => {
  const {
    entryPointUriPathToPermissionKeys,
  } = require('@commercetools-frontend/application-shell/ssr');
  const entryPointUriPath = 'contentools';
  return {
    entryPointUriPath,
    PERMISSIONS: entryPointUriPathToPermissionKeys(entryPointUriPath),
  };
});
