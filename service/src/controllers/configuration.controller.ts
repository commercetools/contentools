import {
  CONTENTOOLS_BASE_URL,
  DEFAULT_BUSINESS_UNIT_KEY,
  SLICES,
  sliceKey,
  type Slice,
} from '../config/slices';
import { customObjects } from '../ct/custom-objects';
import CustomError from '../errors/custom.error';
import { inList } from '../utils/predicate';

const configs = () => customObjects('configuration');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The business unit's value, else the default business unit's, else `null`. */
export async function getSlice(
  businessUnitKey: string,
  slice: Pick<Slice, 'suffix'>
): Promise<unknown> {
  const own = await configs().get(sliceKey(businessUnitKey, slice.suffix));
  if (own) {
    return own.value;
  }
  if (businessUnitKey !== DEFAULT_BUSINESS_UNIT_KEY) {
    return getSlice(DEFAULT_BUSINESS_UNIT_KEY, slice);
  }
  return null;
}

export async function putSlice(
  businessUnitKey: string,
  slice: Slice,
  value: unknown
): Promise<unknown> {
  if (slice.shape === 'array') {
    if (!Array.isArray(value)) {
      throw new CustomError(400, 'value must be an array');
    }
  } else if (!isPlainObject(value)) {
    throw new CustomError(400, 'value must be an object');
  }
  await configs().put(sliceKey(businessUnitKey, slice.suffix), value);
  return value;
}

/** Idempotent. */
export async function deleteSlice(
  businessUnitKey: string,
  slice: Slice
): Promise<void> {
  await configs().delete(sliceKey(businessUnitKey, slice.suffix));
}

/** All slices of a business unit with default-business-unit fallback, from one list request. */
export async function getAllConfigurations(
  businessUnitKey: string
): Promise<Record<string, unknown>> {
  const all = [...SLICES, CONTENTOOLS_BASE_URL];
  const keys = all.flatMap((s) =>
    businessUnitKey === DEFAULT_BUSINESS_UNIT_KEY
      ? [sliceKey(businessUnitKey, s.suffix)]
      : [
          sliceKey(businessUnitKey, s.suffix),
          sliceKey(DEFAULT_BUSINESS_UNIT_KEY, s.suffix),
        ]
  );
  const objects = await configs().list(inList('key', keys));
  const byKey = new Map(objects.map((o) => [o.key, o.value]));

  const pick = (suffix: string, accept: (v: unknown) => boolean): unknown => {
    for (const bu of [businessUnitKey, DEFAULT_BUSINESS_UNIT_KEY]) {
      const value = byKey.get(sliceKey(bu, suffix));
      if (value !== undefined && accept(value)) {
        return value;
      }
    }
    return null;
  };

  const result: Record<string, unknown> = {};
  for (const slice of SLICES) {
    result[slice.aggregateKey] = pick(
      slice.suffix,
      slice.shape === 'array' ? Array.isArray : isPlainObject
    );
  }
  result[CONTENTOOLS_BASE_URL.aggregateKey] = pick(
    CONTENTOOLS_BASE_URL.suffix,
    (v) => typeof v === 'string'
  );
  return result;
}
