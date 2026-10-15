import { SLICES } from '../../src/config/slices';
import type { RouteInfo } from './route-inventory';

const bu = '/:businessUnitKey';
type Row = [RouteInfo['method'], string, RouteInfo['access']];

const itemRoutes = (p: string): Row[] => [
  ['GET', `${bu}/${p}`, 'protected'],
  ['GET', `${bu}/${p}/:key`, 'protected'],
  ['POST', `${bu}/${p}`, 'protected'],
  ['PUT', `${bu}/${p}/:key`, 'protected'],
  ['DELETE', `${bu}/${p}/:key`, 'protected'],
  ['GET', `${bu}/published/${p}/:key`, 'public'],
  ['GET', `${bu}/preview/${p}/:key`, 'protected'],
  ['POST', `${bu}/published/${p}/query`, 'public'],
  ['POST', `${bu}/preview/${p}/query`, 'protected'],
  ['GET', `${bu}/${p}/:key/states`, 'protected'],
  ['PUT', `${bu}/${p}/:key/states/published`, 'protected'],
  ['DELETE', `${bu}/${p}/:key/states/draft`, 'protected'],
  ['GET', `${bu}/${p}/:key/versions`, 'protected'],
];

/**
 * The access table of the content API (spec F design section 2, spec E access
 * table): 73 routes; the conditional public `POST /datasource/:key/test`
 * appears once more as public, hence 74 entries. Health routes (D) and media
 * routes (G) are not listed here.
 */
export const expectedRoutes = (): RouteInfo[] => {
  const rows: Row[] = [
    ...itemRoutes('puck-pages'),
    ...itemRoutes('puck-contents'),
    ['GET', `${bu}/puck-templates`, 'protected'],
    ['GET', `${bu}/puck-templates/:key`, 'protected'],
    ['POST', `${bu}/puck-templates`, 'protected'],
    ['DELETE', `${bu}/puck-templates/:key`, 'protected'],
    ['GET', `${bu}/configuration`, 'public'],
    ['GET', `${bu}/configurations`, 'public'],
    ...SLICES.flatMap((s): Row[] => [
      ['GET', `${bu}/configuration/${s.path}`, 'public'],
      ['POST', `${bu}/configuration/${s.path}`, 'protected'],
      ['PUT', `${bu}/configuration/${s.path}`, 'protected'],
      ['DELETE', `${bu}/configuration/${s.path}`, 'protected'],
    ]),
    ['GET', '/datasource', 'protected'],
    ['GET', '/datasource/:key', 'protected'],
    ['POST', '/datasource/:key', 'protected'],
    ['PUT', '/datasource/:key', 'protected'],
    ['DELETE', '/datasource/:key', 'protected'],
    ['POST', '/datasource/:key/test', 'protected'],
    ['POST', '/datasource/:key/test', 'public'],
    ['GET', '/products/search', 'protected'],
    ['POST', `${bu}/content-type/import`, 'protected'],
    ['POST', '/content-type/import', 'protected'],
  ];
  return rows.map(([method, path, access]) => ({ method, path, access }));
};

/** Concrete URL for an inventory path. */
export const concretePath = (path: string): string =>
  `/service${path.replace(':businessUnitKey', 'default').replace(':key', 'k1')}`;
