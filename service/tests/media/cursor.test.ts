import { decodeCursor, encodeCursor } from '../../src/media/cursor';

const invalid = expect.objectContaining({ mediaCode: 'MEDIA_INVALID_CURSOR' });

describe('cursor', () => {
  const c = encodeCursor({ bu: 'main', ext: 'jpg,png', t: 'token-1' });

  it('round trips', () => {
    expect(decodeCursor(c, { bu: 'main', ext: 'jpg,png' })).toBe('token-1');
  });

  it('rejects garbage', () => {
    expect(() => decodeCursor('%%%', { bu: 'main', ext: '' })).toThrow(invalid);
    expect(() =>
      decodeCursor(Buffer.from('null').toString('base64url'), {
        bu: 'main',
        ext: '',
      })
    ).toThrow(invalid);
    expect(() =>
      decodeCursor(Buffer.from('{"v":2}').toString('base64url'), {
        bu: 'main',
        ext: '',
      })
    ).toThrow(invalid);
  });

  it('rejects a cursor from another business unit or extension set', () => {
    expect(() => decodeCursor(c, { bu: 'other', ext: 'jpg,png' })).toThrow(
      invalid
    );
    expect(() => decodeCursor(c, { bu: 'main', ext: 'gif' })).toThrow(invalid);
  });

  it('rejects oversized tokens', () => {
    const big = encodeCursor({ bu: 'main', ext: '', t: 'x'.repeat(2049) });
    expect(() => decodeCursor(big, { bu: 'main', ext: '' })).toThrow(invalid);
  });
});
