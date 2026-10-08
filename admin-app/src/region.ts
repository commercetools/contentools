const regionToCloudIdentifier = (region: string) => {
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
      return 'us-central1.gcp';
  }
};

export { regionToCloudIdentifier };
