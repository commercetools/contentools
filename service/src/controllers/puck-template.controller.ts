import { v4 as uuidv4 } from 'uuid';
import { PUCK_TEMPLATE_CONTAINER } from '../constants';
import CustomError from '../errors/custom.error';
import { CustomObjectController } from './custom-object.controller';
import { AuthenticatedRequest } from '../types/service.types';
import type { PuckData } from './puck-page.controller';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

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

export interface PuckTemplate {
  id: string;
  version: number;
  container: string;
  key: string;
  value: PuckTemplateValue;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = (): string => new Date().toISOString();

const emptyPuckData: PuckData = { content: [], root: { props: {} } };

// ---------------------------------------------------------------------------
// Public controller functions
// ---------------------------------------------------------------------------

/**
 * List templates for a business unit, optionally filtered by kind
 * (`page` | `content`). Templates are plain custom objects — no draft/published
 * states or version history (unlike pages/content).
 */
export const getPuckTemplates = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  kind?: PuckTemplateKind
): Promise<PuckTemplate[]> => {
  const controller = new CustomObjectController(req, PUCK_TEMPLATE_CONTAINER);

  const filter = kind
    ? `businessUnitKey = "${businessUnitKey}" AND kind = "${kind}"`
    : `businessUnitKey = "${businessUnitKey}"`;

  const templates = await controller.getCustomObjects(`value(${filter})`);
  return templates as PuckTemplate[];
};

export const getPuckTemplate = async (
  req: AuthenticatedRequest,
  key: string
): Promise<PuckTemplate> => {
  const controller = new CustomObjectController(req, PUCK_TEMPLATE_CONTAINER);
  const template = await controller.getCustomObject(key);
  return template as PuckTemplate;
};

export const createPuckTemplate = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  input: Pick<PuckTemplateValue, 'name' | 'kind'> &
    Partial<Pick<PuckTemplateValue, 'puckData'>>
): Promise<PuckTemplate> => {
  if (!input.name) throw new CustomError(400, 'name is required');
  if (input.kind !== 'page' && input.kind !== 'content') {
    throw new CustomError(400, 'kind must be "page" or "content"');
  }

  const key = `puck-template-${uuidv4()}`;
  const controller = new CustomObjectController(req, PUCK_TEMPLATE_CONTAINER);

  const value: PuckTemplateValue = {
    key,
    businessUnitKey,
    name: input.name,
    kind: input.kind,
    puckData: input.puckData ?? emptyPuckData,
    createdAt: now(),
    updatedAt: now(),
  };

  const object = await controller.createCustomObject(key, value);
  return object as PuckTemplate;
};

export const deletePuckTemplate = async (
  req: AuthenticatedRequest,
  key: string
): Promise<void> => {
  const controller = new CustomObjectController(req, PUCK_TEMPLATE_CONTAINER);
  await controller.deleteCustomObject(key);
};
