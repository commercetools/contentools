import type { z } from 'zod';

export enum AvailableNamespaces {
  Auth = 'auth',
  Configuration = 'configuration',
  ContentType = 'content_type',
  ContentItem = 'content_item',
  ContentItemVersion = 'content_item_version',
  ContentItemState = 'content_item_state',
  Datasource = 'datasource',
  File = 'file',
  Page = 'page',
  PageVersion = 'page_version',
  PageState = 'page_state',
  PageRow = 'page_row',
  PageContentItemState = 'page_content_item_state',
  PageComponent = 'page_component',
  Proxy = 'proxy',
}

export type Tool = {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  actions: {
    [namespace: string]: {
      [action: string]: boolean;
    };
  };
};
