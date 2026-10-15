import {
  and,
  assertSafeKey,
  eq,
  inList,
  inValue,
  or,
} from '../../src/utils/predicate';

describe('predicate helpers', () => {
  it('neutralises quote injection', () => {
    expect(eq('businessUnitKey', 'x" OR key = "y')).toBe(
      'businessUnitKey = "x\\" OR key = \\"y"'
    );
  });

  it('escapes backslashes before quotes', () => {
    expect(eq('a', 'x\\')).toBe('a = "x\\\\"');
  });

  it('builds in-lists, conjunctions, disjunctions and value wrappers', () => {
    expect(inList('key', ['a', 'b"'])).toBe('key in ("a", "b\\"")');
    expect(and(eq('a', '1'), eq('b', '2'))).toBe('a = "1" AND b = "2"');
    expect(or(eq('a', '1'), eq('b', '2'))).toBe('(a = "1") OR (b = "2")');
    expect(inValue(eq('a', '1'))).toBe('value(a = "1")');
  });

  it('accepts safe keys and rejects others with 400', () => {
    expect(assertSafeKey('page_1.v~2-x', 'key')).toBe('page_1.v~2-x');
    for (const bad of ['', 'a b', 'a/b', 'x"y', 'a'.repeat(129)]) {
      expect(() => assertSafeKey(bad, 'key')).toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    }
  });
});
