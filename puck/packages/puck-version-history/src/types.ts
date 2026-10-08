import type { PuckData } from '@commercetools-demo/puck-types';

export interface ComponentDiff {
  id: string;
  type: string;
  status: 'added' | 'removed' | 'changed';
  changedProps: string[];
}

export interface PuckDataDiff {
  components: ComponentDiff[];
  rootChanges: string[];
  hasChanges: boolean;
}

/**
 * Generic version entry shape shared by pages and content items.
 * Pages use `puckData`; content items use `data`.
 */
export interface VersionEntry {
  id: string;
  timestamp: string;
  puckData?: PuckData;
  data?: PuckData;
}
