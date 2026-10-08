import type { PuckData } from './puck-data.types';
import type { CtCustomObject } from './puck-api.types';

/** Whether a template seeds a page or a content item. */
export type PuckTemplateKind = 'page' | 'content';

export interface PuckTemplateValue {
  key: string;
  businessUnitKey: string;
  name: string;
  kind: PuckTemplateKind;
  /** Puck data snapshot used to seed new pages/content (stripped or full). */
  puckData: PuckData;
  createdAt: string;
  updatedAt: string;
}

/** A template as returned by the API (custom-object wrapper). */
export type PuckTemplateListItem = CtCustomObject<PuckTemplateValue>;

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreatePuckTemplateInput {
  name: string;
  kind: PuckTemplateKind;
  puckData: PuckData;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export type PuckTemplateResponse = CtCustomObject<PuckTemplateValue>;
export type PuckTemplateListResponse = PuckTemplateListItem[];
