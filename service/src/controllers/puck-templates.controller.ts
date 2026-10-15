import { randomUUID } from 'node:crypto';
import { customObjects } from '../ct/custom-objects';
import CustomError from '../errors/custom.error';
import type { TemplateCreate } from '../schemas/templates';
import type {
  PuckTemplateKind,
  PuckTemplateValue,
  StoredObject,
} from '../types/content';
import { and, eq, inValue } from '../utils/predicate';

const templates = () => customObjects('puckTemplate');

const assertOwned = (obj: StoredObject<PuckTemplateValue>, bu: string): void => {
  if (obj.value.businessUnitKey !== bu) {
    throw new CustomError(404, 'Not found');
  }
};

export async function listTemplates(
  businessUnitKey: string,
  kind?: string
): Promise<Array<StoredObject<PuckTemplateValue>>> {
  const filters = [eq('businessUnitKey', businessUnitKey)];
  if (kind === 'page' || kind === 'content') {
    filters.push(eq('kind', kind satisfies PuckTemplateKind));
  }
  return (await templates().list(
    inValue(and(...filters))
  )) as unknown as Array<StoredObject<PuckTemplateValue>>;
}

export async function getTemplate(
  businessUnitKey: string,
  key: string
): Promise<StoredObject<PuckTemplateValue>> {
  const obj = (await templates().getOrThrow(
    key
  )) as unknown as StoredObject<PuckTemplateValue>;
  assertOwned(obj, businessUnitKey);
  return obj;
}

export async function createTemplate(
  businessUnitKey: string,
  input: TemplateCreate
): Promise<StoredObject<PuckTemplateValue>> {
  const key = `puck-template-${randomUUID()}`;
  const now = new Date().toISOString();
  const value: PuckTemplateValue = {
    key,
    businessUnitKey,
    name: input.name,
    kind: input.kind,
    puckData: input.puckData ?? { content: [], root: { props: {} } },
    createdAt: now,
    updatedAt: now,
  };
  return (await templates().put(
    key,
    value
  )) as unknown as StoredObject<PuckTemplateValue>;
}

export async function deleteTemplate(
  businessUnitKey: string,
  key: string
): Promise<void> {
  await getTemplate(businessUnitKey, key);
  await templates().delete(key);
}
