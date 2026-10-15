import { contentCreate } from '../../src/schemas/contents';
import { pageCreate, pageUpdate } from '../../src/schemas/pages';
import { parseOrThrow, valueBody } from '../../src/schemas/common';
import { queryBody } from '../../src/schemas/query';
import { templateCreate } from '../../src/schemas/templates';

const message = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  return '';
};

describe('schemas', () => {
  it('produces the documented messages', () => {
    expect(message(() => parseOrThrow(pageCreate, { slug: '/a' }))).toBe(
      'name is required'
    );
    expect(message(() => parseOrThrow(pageCreate, { name: 'A' }))).toBe(
      'slug is required'
    );
    expect(message(() => parseOrThrow(contentCreate, { name: 'A' }))).toBe(
      'contentType is required'
    );
    expect(
      message(() => parseOrThrow(templateCreate, { name: 'A', kind: 'x' }))
    ).toBe('kind must be "page" or "content"');
    expect(message(() => parseOrThrow(queryBody, {}))).toBe(
      'query is required in request body'
    );
  });

  it.each([undefined, null, [], 'x', {}, { value: null }, { value: [] }])(
    'valueBody rejects %j',
    (body) => {
      expect(message(() => valueBody(body))).toBe(
        'value is required in request body'
      );
    }
  );

  it('strips unknown keys on update', () => {
    const parsed = parseOrThrow(pageUpdate, {
      name: 'B',
      createdAt: 'x',
      key: 'y',
    });
    expect(parsed).toEqual({ name: 'B' });
  });

  it('accepts puckData with extra Puck fields', () => {
    const parsed = parseOrThrow(pageCreate, {
      name: 'A',
      slug: '/a',
      puckData: {
        content: [{ type: 'Hero', props: { id: '1' }, extra: true }],
        root: { props: {}, other: 1 },
        zones: { side: [] },
        future: 1,
      },
    });
    expect(parsed.puckData?.content).toHaveLength(1);
  });
});
