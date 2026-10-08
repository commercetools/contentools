import type { PuckData } from './puck-data.types';
import type {
  PuckPageListItem,
  PuckPageMeta,
  PuckPageValue,
  PuckPageWithStates,
} from './puck-page.types';
import type { PuckPageState, PuckPageVersion } from './puck-state.types';
import type {
  PuckContentListItem,
  PuckContentMeta,
  PuckContentState,
  PuckContentValue,
  PuckContentVersion,
  PuckContentWithStates,
} from './puck-content.types';

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export interface MediaFile {
  url: string;
  name: string;
  title?: string;
  description?: string;
  isImage: boolean;
  createdAt: Date | string;
  size?: number;
}

export interface MediaLibraryPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface MediaLibraryResult {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
}

/** Generic wrapper representing a CommerceTools custom object. */
export interface CtCustomObject<T> {
  id: string;
  version: number;
  container: string;
  key: string;
  value: T;
  createdAt: string;
  lastModifiedAt: string;
}

// ---------------------------------------------------------------------------
// Request bodies (pages)
// ---------------------------------------------------------------------------

export interface CreatePuckPageInput {
  name: string;
  slug: string;
  puckData?: PuckData;
  meta?: PuckPageMeta;
}

export interface UpdatePuckPageInput {
  name?: string;
  slug?: string;
  puckData?: PuckData;
  meta?: PuckPageMeta;
}

// ---------------------------------------------------------------------------
// Response types (pages)
// ---------------------------------------------------------------------------

export type PuckPageResponse = CtCustomObject<PuckPageValue>;
export type PuckPageListResponse = PuckPageListItem[];
export type PuckPageWithStatesResponse = PuckPageWithStates;
export type PuckPageStateResponse = PuckPageState;
export type PuckPageVersionResponse = PuckPageVersion;

// ---------------------------------------------------------------------------
// Request bodies (contents)
// ---------------------------------------------------------------------------

export interface CreatePuckContentInput {
  name: string;
  contentType: string;
  data?: PuckData;
  meta?: PuckContentMeta;
}

export interface UpdatePuckContentInput {
  name?: string;
  contentType?: string;
  data?: PuckData;
  meta?: PuckContentMeta;
}

// ---------------------------------------------------------------------------
// Response types (contents)
// ---------------------------------------------------------------------------

export type PuckContentResponse = CtCustomObject<PuckContentValue>;
export type PuckContentListResponse = PuckContentListItem[];
export type PuckContentWithStatesResponse = PuckContentWithStates;
export type PuckContentStateResponse = PuckContentState;
export type PuckContentVersionResponse = PuckContentVersion;
