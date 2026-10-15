import { resetConfigurationForTests } from '../../src/config/env';
import {
  getProductsBySku,
  searchProductsController,
} from '../../src/controllers/products.controller';
import { resetApiRootForTests } from '../../src/ct/client';
import {
  resolveDatasource,
  resolvePuckData,
} from '../../src/services/datasource-resolution';
import type { PuckData } from '../../src/types/content';
import { resetLoggerForTests } from '../../src/utils/logger.utils';
import * as fake from '../support/fake-ct';

beforeEach(() => {
  resetConfigurationForTests();
  resetApiRootForTests();
  resetLoggerForTests();
});

const statusOf = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return (e as { statusCode?: unknown }).statusCode;
  }
  return undefined;
};

describe('product search mapping', () => {
  it('picks localized values with fallbacks and a SKU from the first variant that has one', async () => {
    fake.productSearch.respondWith(() => [
      {
        id: 'p1',
        productProjection: {
          id: 'p1',
          name: { de: 'Schuh' },
          slug: { 'en-US': 'shoe' },
          masterVariant: { id: 1 },
          variants: [
            { id: 2, sku: 'SKU-2', images: [{ url: 'https://img/2.png' }] },
          ],
        },
      },
    ]);
    const res = await searchProductsController('shoe', 20, 'en-US');
    expect(res).toEqual([
      {
        id: 'p1',
        name: 'Schuh',
        sku: 'SKU-2',
        image: 'https://img/2.png',
        slug: 'shoe',
      },
    ]);
  });

  it('strips typed wildcards and sends them in all three clauses', async () => {
    await searchProductsController('a*b?');
    const body = fake.productSearch.calls[0] as {
      query: { or: Array<{ wildcard: { value: string } }> };
    };
    expect(body.query.or.map((c) => c.wildcard.value)).toEqual([
      '*ab*',
      '*ab*',
      '*ab*',
    ]);
  });

  it('answers an empty list for empty text without calling commercetools', async () => {
    expect(await searchProductsController('   ')).toEqual([]);
    expect(fake.productSearch.calls).toHaveLength(0);
  });

  it('maps a 400 from the search API to 502 with a precise message', async () => {
    fake.productSearch.failWith(400);
    await expect(searchProductsController('x')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Product search is not available for this project',
    });
  });

  it('maps an upstream 503 to 503', async () => {
    fake.productSearch.failWith(503);
    expect(await statusOf(searchProductsController('x'))).toBe(503);
  }, 15_000);
});

describe('products-by-sku', () => {
  it('rejects more than 25 SKUs', async () => {
    const skus = Array.from({ length: 26 }, (_, i) => `S${i}`).join(',');
    expect(await statusOf(getProductsBySku(skus))).toBe(400);
    expect(fake.productSearch.calls).toHaveLength(0);
  });

  it('drops empty entries', async () => {
    await getProductsBySku('a, ,b');
    expect(fake.productSearch.calls).toHaveLength(2);
  });

  it('requires at least one SKU', async () => {
    expect(await statusOf(getProductsBySku(' , '))).toBe(400);
  });
});

describe('resolvePuckData', () => {
  const projection = { id: 'p1', masterVariant: { id: 1, sku: 'S1' } };
  const ds = (type: string, skus: string[]) => ({ type, skus });

  it('adds resolvedData in content and zones and leaves other props alone', async () => {
    fake.productSearch.respondWith(() => [
      { id: 'p1', productProjection: projection },
    ]);
    const data: PuckData = {
      content: [
        {
          type: 'Hero',
          props: { id: '1', title: 'x', product: ds('product-by-sku', ['S1']) },
        },
      ],
      root: { props: {} },
      zones: {
        sidebar: [
          { type: 'Grid', props: { id: '2', items: ds('products-by-sku', ['S1']) } },
        ],
      },
    };
    const out = await resolvePuckData(data);
    expect(out.content[0]?.props.title).toBe('x');
    expect(out.content[0]?.props.product).toEqual({
      ...ds('product-by-sku', ['S1']),
      resolvedData: projection,
    });
    expect(out.zones?.sidebar?.[0]?.props.items).toEqual({
      ...ds('products-by-sku', ['S1']),
      resolvedData: [projection],
    });
  });

  it('stores null when the lookup fails or the type is unknown', async () => {
    fake.productSearch.failWith(400);
    const out = await resolvePuckData({
      content: [
        {
          type: 'A',
          props: {
            id: '1',
            a: ds('product-by-sku', ['S1']),
            b: ds('other-type', ['S1']),
          },
        },
      ],
      root: {},
    });
    expect(out.content[0]?.props.a).toMatchObject({ resolvedData: null });
    expect(out.content[0]?.props.b).toMatchObject({ resolvedData: null });
  });

  it('truncates to 25 SKUs when resolving a page', async () => {
    fake.productSearch.respondWith(() => []);
    const skus = Array.from({ length: 40 }, (_, i) => `S${i}`);
    await resolvePuckData({
      content: [{ type: 'A', props: { id: '1', p: ds('products-by-sku', skus) } }],
      root: {},
    });
    expect(fake.productSearch.calls).toHaveLength(25);
  });

  it('resolveDatasource swallows errors', async () => {
    fake.productSearch.failWith(400);
    expect(await resolveDatasource('product-by-sku', { sku: 'S' })).toBeNull();
  });
});
