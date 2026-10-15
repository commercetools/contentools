import { MediaConfigError } from './errors';
import { parseAllowedMimeTypes } from './mime';

export interface CommonMediaConfig {
  pathPrefix: string;
  maxUploadBytes: number;
  allowedMimeTypes: ReadonlySet<string>;
  publicBaseUrl: string | null;
}

export interface GcpServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export type GcpMediaConfig = CommonMediaConfig & {
  provider: 'gcp';
  bucket: string;
  serviceAccount: GcpServiceAccount;
};
export type AwsMediaConfig = CommonMediaConfig & {
  provider: 'aws';
  bucket: string;
  region: string;
  endpoint: string | null;
  accessKeyId: string;
  secretAccessKey: string;
};
export type CloudinaryMediaConfig = CommonMediaConfig & {
  provider: 'cloudinary';
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};
export type NoMediaConfig = CommonMediaConfig & { provider: 'none' };

export type MediaConfig =
  NoMediaConfig | GcpMediaConfig | AwsMediaConfig | CloudinaryMediaConfig;

export const DEFAULT_ALLOWED_MIME_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf';
export const MAX_UPLOAD_CEILING = 26214400;
const PROVIDERS = ['none', 'gcp', 'aws', 'cloudinary'] as const;

type Env = Record<string, string | undefined>;

function parseServiceAccount(raw: string): GcpServiceAccount | null {
  try {
    const json: unknown = JSON.parse(
      Buffer.from(raw, 'base64').toString('utf8')
    );
    if (typeof json !== 'object' || json === null) return null;
    const o = json as Record<string, unknown>;
    if (
      typeof o.client_email !== 'string' ||
      typeof o.private_key !== 'string'
    ) {
      return null;
    }
    return {
      client_email: o.client_email,
      private_key: o.private_key,
      ...(typeof o.project_id === 'string' && { project_id: o.project_id }),
    };
  } catch {
    return null;
  }
}

/**
 * Pure: reads only the object it is given. Collects every problem and throws one MediaConfigError that names
 * configuration keys, never values (the object holds credentials; do not log it).
 */
export function loadMediaConfig(env: Env): MediaConfig {
  const problems: string[] = [];
  const get = (key: string): string | undefined => {
    const v = env[key]?.trim();
    return v === undefined || v === '' ? undefined : v;
  };

  const providerRaw = (get('MEDIA_STORAGE_PROVIDER') ?? 'none').toLowerCase();
  const provider = (PROVIDERS as readonly string[]).includes(providerRaw)
    ? (providerRaw as (typeof PROVIDERS)[number])
    : undefined;
  if (!provider) {
    problems.push(
      'MEDIA_STORAGE_PROVIDER must be one of none, gcp, aws, cloudinary'
    );
  }

  const prefix = (get('MEDIA_PATH_PREFIX') ?? 'contentools/media').replace(
    /^\/+|\/+$/g,
    ''
  );
  if (!/^[A-Za-z0-9/_-]{1,200}$/.test(prefix) || prefix.includes('//')) {
    problems.push(
      'MEDIA_PATH_PREFIX must match [A-Za-z0-9/_-], 1 to 200 characters, without empty segments'
    );
  }

  const maxRaw = get('MEDIA_MAX_UPLOAD_BYTES') ?? '10485760';
  const max = /^\d+$/.test(maxRaw) ? Number(maxRaw) : NaN;
  if (!Number.isInteger(max) || max < 1024 || max > MAX_UPLOAD_CEILING) {
    problems.push(
      `MEDIA_MAX_UPLOAD_BYTES must be an integer between 1024 and ${MAX_UPLOAD_CEILING}`
    );
  }

  let allowed: ReadonlySet<string> = new Set();
  try {
    allowed = parseAllowedMimeTypes(
      get('MEDIA_ALLOWED_MIME_TYPES') ?? DEFAULT_ALLOWED_MIME_TYPES
    );
    if (allowed.size === 0) {
      problems.push('MEDIA_ALLOWED_MIME_TYPES must list at least one type');
    }
  } catch {
    problems.push('MEDIA_ALLOWED_MIME_TYPES contains an invalid entry');
  }

  let publicBaseUrl: string | null = null;
  const baseRaw = get('MEDIA_PUBLIC_BASE_URL');
  if (baseRaw !== undefined) {
    const ok =
      URL.canParse(baseRaw) &&
      (baseRaw.startsWith('https://') ||
        baseRaw.startsWith('http://localhost'));
    if (ok) {
      publicBaseUrl = baseRaw.replace(/\/+$/, '');
    } else {
      problems.push('MEDIA_PUBLIC_BASE_URL must be an https URL');
    }
  }

  const common: CommonMediaConfig = {
    pathPrefix: prefix,
    maxUploadBytes: max,
    allowedMimeTypes: allowed,
    publicBaseUrl,
  };
  const missing = (keys: string[]): string[] => keys.filter((k) => !get(k));
  let result: MediaConfig | undefined;

  if (provider === 'gcp') {
    const lacking = missing([
      'MEDIA_GCP_BUCKET',
      'MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64',
    ]);
    if (lacking.length > 0) {
      problems.push(
        `${lacking.join(', ')} required when MEDIA_STORAGE_PROVIDER=gcp`
      );
    } else {
      const account = parseServiceAccount(
        get('MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64') as string
      );
      if (!account) {
        problems.push(
          'MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64 is not base64 of a service-account JSON'
        );
      } else {
        result = {
          ...common,
          provider: 'gcp',
          bucket: get('MEDIA_GCP_BUCKET') as string,
          serviceAccount: account,
        };
      }
    }
  } else if (provider === 'aws') {
    const lacking = missing([
      'MEDIA_AWS_BUCKET',
      'MEDIA_AWS_ACCESS_KEY_ID',
      'MEDIA_AWS_SECRET_ACCESS_KEY',
    ]);
    const endpoint = get('MEDIA_AWS_ENDPOINT') ?? null;
    if (endpoint !== null && !/^https?:\/\//.test(endpoint)) {
      problems.push('MEDIA_AWS_ENDPOINT must be an http(s) URL');
    }
    if (lacking.length > 0) {
      problems.push(
        `${lacking.join(', ')} required when MEDIA_STORAGE_PROVIDER=aws`
      );
    } else {
      result = {
        ...common,
        provider: 'aws',
        bucket: get('MEDIA_AWS_BUCKET') as string,
        region: get('MEDIA_AWS_REGION') ?? 'us-east-1',
        endpoint: endpoint === null ? null : endpoint.replace(/\/+$/, ''),
        accessKeyId: get('MEDIA_AWS_ACCESS_KEY_ID') as string,
        secretAccessKey: get('MEDIA_AWS_SECRET_ACCESS_KEY') as string,
      };
    }
  } else if (provider === 'cloudinary') {
    const lacking = missing([
      'MEDIA_CLOUDINARY_CLOUD_NAME',
      'MEDIA_CLOUDINARY_API_KEY',
      'MEDIA_CLOUDINARY_API_SECRET',
    ]);
    if (
      [...allowed].some(
        (m) => !m.startsWith('image/') && m !== 'application/pdf'
      )
    ) {
      problems.push(
        'MEDIA_ALLOWED_MIME_TYPES may only list image/* and application/pdf for the cloudinary provider'
      );
    }
    if (lacking.length > 0) {
      problems.push(
        `${lacking.join(', ')} required when MEDIA_STORAGE_PROVIDER=cloudinary`
      );
    } else {
      result = {
        ...common,
        provider: 'cloudinary',
        cloudName: get('MEDIA_CLOUDINARY_CLOUD_NAME') as string,
        apiKey: get('MEDIA_CLOUDINARY_API_KEY') as string,
        apiSecret: get('MEDIA_CLOUDINARY_API_SECRET') as string,
      };
    }
  } else if (provider === 'none') {
    result = { ...common, provider: 'none' };
  }

  if (problems.length > 0 || !result) {
    throw new MediaConfigError(problems.join('; '));
  }
  return result;
}
