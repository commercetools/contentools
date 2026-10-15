import CustomError from '../errors/custom.error';

export type MediaErrorCode =
  | 'MEDIA_NOT_CONFIGURED'
  | 'MEDIA_FILE_REQUIRED'
  | 'MEDIA_FILE_TOO_LARGE'
  | 'MEDIA_FILE_COUNT_EXCEEDED'
  | 'MEDIA_TYPE_NOT_ALLOWED'
  | 'MEDIA_TYPE_MISMATCH'
  | 'MEDIA_INVALID_BUSINESS_UNIT'
  | 'MEDIA_INVALID_CURSOR'
  | 'MEDIA_INVALID_EXTENSIONS'
  | 'MEDIA_INVALID_METADATA'
  | 'MEDIA_STORAGE_UNAVAILABLE';

/** A CustomError with a stable `code`; the error middleware renders { message, statusCode, correlationId, code }. */
export class MediaError extends CustomError {
  constructor(
    status: number,
    readonly mediaCode: MediaErrorCode,
    message: string
  ) {
    super(status, message, undefined, { code: mediaCode });
    this.name = 'MediaError';
  }
}

/** Thrown by loadMediaConfig. The message names configuration KEYS only, never values. */
export class MediaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaConfigError';
  }
}

/** Thrown by a provider connectivity check. `reason` is an error name or code, never an SDK message. */
export class StorageUnavailableError extends Error {
  constructor(
    readonly provider: string,
    readonly reason: string
  ) {
    super(`storage ${provider} unavailable: ${reason}`);
    this.name = 'StorageUnavailableError';
  }
}
