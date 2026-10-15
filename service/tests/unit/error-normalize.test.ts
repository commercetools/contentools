import CustomError from '../../src/errors/custom.error';
import { normalize } from '../../src/middleware/error.middleware';

describe('normalize', () => {
  it('keeps a CustomError status, message, code and errors', () => {
    const err = new CustomError(
      409,
      'nope',
      [{ statusCode: 1, message: 'm' }],
      'X_CODE'
    );
    expect(normalize(err)).toEqual({
      status: 409,
      message: 'nope',
      code: 'X_CODE',
      errors: [{ statusCode: 1, message: 'm' }],
    });
  });

  it('coerces a string status', () => {
    expect(normalize(new CustomError('404', 'x')).status).toBe(404);
  });

  it('falls back to 500 for an invalid CustomError status', () => {
    expect(normalize(new CustomError('abc', 'x')).status).toBe(500);
  });

  it.each([
    [{ type: 'entity.parse.failed' }, 400, 'Invalid JSON body'],
    [{ type: 'entity.too.large' }, 413, 'Payload too large'],
    [{ status: 415, expose: true, message: 'unsupported' }, 415, 'unsupported'],
  ])('maps body parser style error %j', (error, status, message) => {
    expect(normalize(error)).toEqual({ status, message });
  });

  it('does not expose a 4xx error that is not marked exposable', () => {
    expect(normalize({ status: 400, message: 'secret detail' }).status).toBe(
      500
    );
  });

  it('hides unexpected error text', () => {
    const out = normalize(new Error('db password is hunter2'));
    expect(out).toEqual({ status: 500, message: 'Internal server error' });
  });
});
