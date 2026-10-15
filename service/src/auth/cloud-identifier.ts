export const CLOUD_IDENTIFIERS = [
  'gcp-au',
  'gcp-eu',
  'gcp-us',
  'aws-eu',
  'aws-us',
] as const;
export type CloudIdentifier = (typeof CLOUD_IDENTIFIERS)[number];

const BY_API_HOST: Record<string, CloudIdentifier> = {
  'api.australia-southeast1.gcp.commercetools.com': 'gcp-au',
  'api.europe-west1.gcp.commercetools.com': 'gcp-eu',
  'api.us-central1.gcp.commercetools.com': 'gcp-us',
  'api.eu-central-1.aws.commercetools.com': 'aws-eu',
  'api.us-east-2.aws.commercetools.com': 'aws-us',
};

/** Connect injects CTP_API_URL but no region; the Merchant Center cloud identifier is derivable from its host. */
export function deriveCloudIdentifier(
  apiUrl: string
): CloudIdentifier | undefined {
  try {
    return BY_API_HOST[new URL(apiUrl).hostname];
  } catch {
    return undefined;
  }
}
