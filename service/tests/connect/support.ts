import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export const SERVICE_DIR = path.resolve(__dirname, '../..');
export const REPO_ROOT = path.resolve(SERVICE_DIR, '..');

export interface ConfigEntry {
  key: string;
  description: string;
  required: boolean;
  default?: string;
}

interface ConfigurationBlock {
  standardConfiguration?: ConfigEntry[];
  securedConfiguration?: ConfigEntry[];
}

export interface Manifest {
  deployAs: {
    name: string;
    applicationType: string;
    endpoint?: string;
    scripts?: { postDeploy?: string; preUndeploy?: string };
    configuration?: ConfigurationBlock;
  }[];
  inheritAs?: {
    apiClient?: { scopes: string[] };
    configuration?: ConfigurationBlock;
  };
}

export const readManifest = (): Manifest =>
  parse(
    fs.readFileSync(path.join(REPO_ROOT, 'connect.yaml'), 'utf8')
  ) as Manifest;

export const serviceBlock = (manifest: Manifest = readManifest()) => {
  const block = manifest.deployAs.find((a) => a.name === 'service');
  if (!block) throw new Error('connect.yaml has no service application');
  return {
    block,
    standard: block.configuration?.standardConfiguration ?? [],
    secured: block.configuration?.securedConfiguration ?? [],
  };
};

/** Every `.ts` file below `dir`, as absolute paths. */
export const listTsFiles = (dir: string): string[] =>
  (fs.readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(dir, f));
