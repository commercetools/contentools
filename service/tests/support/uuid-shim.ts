// uuid >= 12 ships ESM only, which jest (CommonJS) cannot load. Tests map `uuid` to this shim.
import { randomUUID } from 'crypto';

export const v4 = (): string => randomUUID();
