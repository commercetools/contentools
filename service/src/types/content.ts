/** One Puck component instance. Loose on purpose: Puck evolves. */
export interface PuckComponentData {
  type: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PuckData {
  content: PuckComponentData[];
  root: { props?: Record<string, unknown>; [key: string]: unknown };
  zones?: Record<string, PuckComponentData[]>;
  [key: string]: unknown;
}

export interface PuckPageMeta {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/** Fields every stored content item (page, content item) carries. */
export interface ItemValue {
  key: string;
  businessUnitKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface PuckPageValue extends ItemValue {
  name: string;
  slug: string;
  puckData: PuckData;
  meta?: Record<string, unknown>;
}

export interface PuckContentValue extends ItemValue {
  name: string;
  contentType: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export type PuckTemplateKind = 'page' | 'content';

export interface PuckTemplateValue extends ItemValue {
  name: string;
  kind: PuckTemplateKind;
  puckData: PuckData;
}

export interface ItemState<V> {
  key: string;
  businessUnitKey: string;
  states: { draft?: V; published?: V };
}

export type ItemVersionEntry<V> = V & { id: string; timestamp: string };

export interface ItemVersions<V> {
  key: string;
  businessUnitKey: string;
  versions: Array<ItemVersionEntry<V>>;
}

/** A commercetools custom object narrowed to our value type. */
export interface StoredObject<V> {
  id: string;
  version: number;
  container: string;
  key: string;
  value: V;
  createdAt?: string;
  lastModifiedAt?: string;
}

export type WithStates<V> = StoredObject<V> & {
  states: ItemState<V>['states'];
};
