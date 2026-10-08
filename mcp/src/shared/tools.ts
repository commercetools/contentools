import type { Tool } from '../types/tools';
import { authTools } from './auth/tools';
import { configurationTools } from './configuration/tools';
import { contentTypeTools } from './content-type/tools';
import { contentItemTools } from './content-item/tools';
import { contentItemVersionTools } from './content-item-version/tools';
import { contentItemStateTools } from './content-item-state/tools';
import { datasourceTools } from './datasource/tools';
import { fileTools } from './file/tools';
import { pageTools } from './page/tools';
import { pageVersionTools } from './page-version/tools';
import { pageStateTools } from './page-state/tools';
import { pageRowTools } from './page-row/tools';
import { pageContentItemStateTools } from './page-content-item-state/tools';
import { pageComponentTools } from './page-component/tools';
import { proxyTools } from './proxy/tools';

export const allTools: Tool[] = [
  ...authTools,
  ...configurationTools,
  ...contentTypeTools,
  ...contentItemTools,
  ...contentItemVersionTools,
  ...contentItemStateTools,
  ...datasourceTools,
  ...fileTools,
  ...pageTools,
  ...pageVersionTools,
  ...pageStateTools,
  ...pageRowTools,
  ...pageContentItemStateTools,
  ...pageComponentTools,
  ...proxyTools,
];
