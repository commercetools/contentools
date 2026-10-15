import fs from 'node:fs';
import path from 'node:path';
import { readManifest, REPO_ROOT, SERVICE_DIR, serviceBlock } from './support';

const SECRET_PATTERN = /SECRET|TOKEN|PRIVATE|PASSWORD|API_KEY|ACCESS_KEY|_B64$/;

const SECURED_KEYS = [
  'MEDIA_AWS_ACCESS_KEY_ID',
  'MEDIA_AWS_SECRET_ACCESS_KEY',
  'MEDIA_CLOUDINARY_API_KEY',
  'MEDIA_CLOUDINARY_API_SECRET',
  'MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64',
  'SERVICE_API_TOKEN',
];

const readPackage = () =>
  JSON.parse(
    fs.readFileSync(path.join(SERVICE_DIR, 'package.json'), 'utf8')
  ) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

describe('connect.yaml manifest', () => {
  const manifest = readManifest();
  const { block, standard, secured } = serviceBlock(manifest);

  it('names every application after a directory at the repository root', () => {
    for (const app of manifest.deployAs) {
      expect(fs.statSync(path.join(REPO_ROOT, app.name)).isDirectory()).toBe(
        true
      );
    }
  });

  it('declares the service application with endpoint /service', () => {
    expect(block.applicationType).toBe('service');
    expect(block.endpoint).toBe('/service');
  });

  it('declares the lifecycle scripts as package scripts', () => {
    expect(block.scripts?.postDeploy).toBe('yarn connector:post-deploy');
    expect(block.scripts?.preUndeploy).toBe('yarn connector:pre-undeploy');
    const { scripts } = readPackage();
    expect(scripts['connector:post-deploy']).toBe(
      'node build/connector/post-deploy.js'
    );
    expect(scripts['connector:pre-undeploy']).toBe(
      'node build/connector/pre-undeploy.js'
    );
  });

  it('declares 17 standard and 6 secured keys with description and boolean required', () => {
    expect(standard).toHaveLength(17);
    expect(secured).toHaveLength(6);
    for (const entry of [...standard, ...secured]) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
      expect(typeof entry.required).toBe('boolean');
    }
  });

  it('declares no key twice and no injected CTP_ key', () => {
    const keys = [...standard, ...secured].map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((k) => k.startsWith('CTP_'))).toEqual([]);
  });

  it('quotes defaults as strings and requires no key', () => {
    for (const entry of [...standard, ...secured]) {
      if (entry.default !== undefined) {
        expect(typeof entry.default).toBe('string');
      }
      expect(entry.required).toBe(false);
    }
  });

  it('keeps secrets out of standardConfiguration', () => {
    expect(standard.filter((e) => SECRET_PATTERN.test(e.key))).toEqual([]);
  });

  it('declares the six secured keys', () => {
    expect(secured.map((e) => e.key).sort()).toEqual(SECURED_KEYS);
  });

  it('declares the shared API client with exactly the two audited scopes', () => {
    expect([...(manifest.inheritAs?.apiClient?.scopes ?? [])].sort()).toEqual([
      'manage_key_value_documents',
      'view_products',
    ]);
  });

  it('does not declare CLOUD_IDENTIFIER in the service block', () => {
    expect([...standard, ...secured].map((e) => e.key)).not.toContain(
      'CLOUD_IDENTIFIER'
    );
  });
});

describe('service package', () => {
  const pkg = readPackage();

  it.each([
    'build',
    'gcp-build',
    'start',
    'start:dev',
    'typecheck',
    'lint',
    'test',
    'test:e2e',
    'connector:post-deploy',
    'connector:pre-undeploy',
  ])('has the script %s', (name) => {
    expect(pkg.scripts[name]).toBeTruthy();
  });

  it('builds with tsc, bundles the lifecycle scripts and starts build/index.js', () => {
    expect(pkg.scripts.build).toContain('tsc -p tsconfig.build.json');
    expect(pkg.scripts.build).toContain('scripts/bundle-lifecycle.mjs');
    expect(pkg.scripts['gcp-build']).toBe('yarn build');
    expect(pkg.scripts.start).toBe('node build/index.js');
  });

  it('uses the current commercetools SDKs only', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(all['@commercetools/sdk-client-v2']).toBeUndefined();
    expect(pkg.dependencies['@commercetools/platform-sdk']).toMatch(/\^8/);
    expect(pkg.dependencies['@commercetools/ts-client']).toMatch(/\^4/);
  });
});

describe('repository layout', () => {
  it('is not a workspace root', () => {
    const root = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(root.workspaces).toBeUndefined();
  });

  it('has no container build files', () => {
    const names = fs.readdirSync(SERVICE_DIR).filter((n) => /docker/i.test(n));
    expect(names).toEqual([]);
  });

  it('has no parked unported sources', () => {
    expect(fs.existsSync(path.join(SERVICE_DIR, 'src/_pending'))).toBe(false);
  });

  it('locks dependencies with Yarn 1 only', () => {
    expect(fs.existsSync(path.join(SERVICE_DIR, 'yarn.lock'))).toBe(true);
    expect(fs.existsSync(path.join(SERVICE_DIR, 'package-lock.json'))).toBe(
      false
    );
  });

  it('has no hosted CI workflows', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, '.github/workflows'))).toBe(
      false
    );
  });
});
