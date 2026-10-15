import { parseQuery } from '../../src/services/query-grammar';

const allowed = ['slug', 'name', 'key'] as const;

describe('parseQuery', () => {
  it.each([
    ['slug = "/home"', [{ field: 'slug', value: '/home' }]],
    [
      'slug="/home" and name = "A"',
      [
        { field: 'slug', value: '/home' },
        { field: 'name', value: 'A' },
      ],
    ],
    ['slug = "a\\"b"', [{ field: 'slug', value: 'a"b' }]],
    [
      'name = "x AND slug = \\"y\\""',
      [{ field: 'name', value: 'x AND slug = "y"' }],
    ],
  ])('accepts %s', (query, expected) => {
    expect(parseQuery(query, allowed)).toEqual(expected);
  });

  it.each([
    'slug = "x" OR key = "y"',
    'slug = "x" AND',
    'slug != "x"',
    'unknown = "x"',
    'slug = x',
    '',
    '(slug = "x")',
    'slug = "x\\"',
  ])('rejects %j with 400', (query) => {
    expect(() => parseQuery(query, allowed)).toThrow(
      expect.objectContaining({ statusCode: 400, message: 'Invalid query' })
    );
  });
});
