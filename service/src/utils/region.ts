/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

const regionToCloudIdentifier = (region?: string) => {
  if (!region) {
    return 'us-central1.gcp';
  }

  switch (region) {
    case 'gcp-us':
      return 'us-central1.gcp';
    case 'gcp-eu':
      return 'europe-west1.gcp';
    case 'gcp-au':
      return 'australia-southeast1.gcp';
    case 'aws-eu':
      return 'eu-central-1.aws';
    case 'aws-us':
      return 'us-east-2.aws';
    default:
      // Already a cloud identifier, e.g. "europe-west1.gcp" or "eu-central-1.aws"
      if (/^[a-z0-9-]+\.(gcp|aws)$/.test(region)) {
        return region;
      }
      return 'us-central1.gcp';
  }
};

export { regionToCloudIdentifier };
