import type { PuckData } from './puck-data.types';

export interface PuckStateInfo {
  draft?: PuckPageValue;
  published?: PuckPageValue;
}

export interface PuckPageMeta {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * The value stored in a CommerceTools custom object for a puck page.
 * puckData is Puck's native Data format stored verbatim.
 */
export interface PuckPageValue {
  key: string;
  businessUnitKey: string;
  name: string;
  /** URL path, e.g. "/home". Used for slug-based queries. */
  slug: string;
  puckData: PuckData;
  meta?: PuckPageMeta;
  createdAt: string;
  updatedAt: string;
}

/** A puck page as returned by the list endpoint (includes state info). */
export interface PuckPageListItem {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckPageValue;
  states: PuckStateInfo;
}

/** A single puck page with full state details. */
export interface PuckPageWithStates {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckPageValue;
  states: PuckStateInfo;
}
