import type { PuckData } from './puck-data.types';

export interface PuckContentMeta {
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface PuckContentValue {
  key: string;
  businessUnitKey: string;
  name: string;
  /** Free-form tag, e.g. "hero", "banner". No schema enforcement. */
  contentType: string;
  /** Puck native data — edited visually with the Puck editor. */
  data: PuckData;
  meta?: PuckContentMeta;
  createdAt: string;
  updatedAt: string;
}

export interface PuckContentStateInfo {
  draft?: PuckContentValue;
  published?: PuckContentValue;
}

/** A puck content item as returned by the list endpoint (includes state info). */
export interface PuckContentListItem {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckContentValue;
  states: PuckContentStateInfo;
}

/** A single puck content item with full state details. */
export interface PuckContentWithStates {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckContentValue;
  states: PuckContentStateInfo;
}

export interface PuckContentState {
  key: string;
  businessUnitKey: string;
  states: PuckContentStateInfo;
}

export interface PuckContentVersionEntry extends PuckContentValue {
  id: string;
  timestamp: string;
}

export interface PuckContentVersion {
  key: string;
  businessUnitKey: string;
  versions: PuckContentVersionEntry[];
}
