import type { ContentCreate, ContentUpdate } from '../schemas/contents';
import { createItemStore } from '../services/item-store';
import type { PuckContentValue } from '../types/content';
import { eq } from '../utils/predicate';

export const contentStore = createItemStore<
  PuckContentValue,
  ContentCreate,
  ContentUpdate
>({
  keyPrefix: 'puck-content-',
  containers: {
    item: 'puckContent',
    state: 'puckContentState',
    version: 'puckContentVersion',
  },
  queryFields: ['contentType', 'name', 'key'],
  build: (businessUnitKey, key, input) => {
    const now = new Date().toISOString();
    return {
      key,
      businessUnitKey,
      name: input.name,
      contentType: input.contentType,
      data: input.data ?? {},
      ...(input.meta && { meta: input.meta }),
      createdAt: now,
      updatedAt: now,
    };
  },
  applyUpdate: (existing, input) => ({
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.contentType !== undefined && { contentType: input.contentType }),
    ...(input.data !== undefined && { data: input.data }),
    ...(input.meta !== undefined && { meta: input.meta }),
    updatedAt: new Date().toISOString(),
  }),
  extraListWhere: (filter) =>
    filter.contentType ? [eq('contentType', filter.contentType)] : [],
});
