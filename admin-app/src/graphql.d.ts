declare module '*.graphql' {
  import { DocumentNode } from 'graphql';
  const value: DocumentNode;
  export default value;
}

declare module '*.ctp.graphql' {
  import { DocumentNode } from 'graphql';
  const value: DocumentNode;
  export default value;
}
