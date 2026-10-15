const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

/** Dist-tag for a version: prerelease -> next, stable -> latest. */
export function tagFor(version) {
  return /-/.test(version) ? 'next' : 'latest';
}

/**
 * Derive the publishable manifest from the template and the app manifest.
 * Throws with a readable message when an assertion fails.
 */
export function assembleManifest(template, pkg) {
  if (pkg.private !== true) {
    // The app manifest must stay private so a plain `npm publish` in mcp/ fails.
    throw new Error('app package.json must stay "private": true');
  }
  if (!SEMVER.test(pkg.version ?? '')) throw new Error(`invalid semver version: ${pkg.version}`);
  for (const key of ['private', 'scripts', 'dependencies', 'devDependencies']) {
    if (key in template) throw new Error(`template must not contain "${key}"`);
  }
  const manifest = { name: '@commercetools-labs/contentools-mcp', version: pkg.version, ...template };
  for (const s of collectStrings(manifest)) {
    if (/^(workspace|file|link):/.test(s)) throw new Error(`forbidden protocol in manifest value: ${s}`);
  }
  return manifest;
}
