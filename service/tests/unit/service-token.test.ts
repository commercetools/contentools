import { matchesServiceToken } from '../../src/auth/service-token';

describe('matchesServiceToken', () => {
  const expected = 'x'.repeat(40);

  it('accepts an equal value', () => {
    expect(matchesServiceToken(expected, expected)).toBe(true);
  });

  it('rejects a different value of the same length', () => {
    expect(matchesServiceToken('y'.repeat(40), expected)).toBe(false);
  });

  it('rejects values of another length without throwing', () => {
    expect(matchesServiceToken('x', expected)).toBe(false);
    expect(matchesServiceToken(`${expected}x`, expected)).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(matchesServiceToken('', expected)).toBe(false);
  });
});
