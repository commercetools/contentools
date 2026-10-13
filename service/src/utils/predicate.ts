/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import CustomError from '../errors/custom.error';

const esc = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const eq = (field: string, value: string): string =>
  `${field} = "${esc(value)}"`;

export const inList = (field: string, values: string[]): string =>
  `${field} in (${values.map((v) => `"${esc(v)}"`).join(', ')})`;

export const and = (...parts: string[]): string => parts.join(' AND ');

export const or = (...parts: string[]): string =>
  parts.map((p) => `(${p})`).join(' OR ');

export const inValue = (inner: string): string => `value(${inner})`;

const SAFE_KEY = /^[A-Za-z0-9_.~-]{1,128}$/;

export function assertSafeKey(value: string, name: string): string {
  if (!SAFE_KEY.test(value)) {
    throw new CustomError(400, `Invalid ${name}`);
  }
  return value;
}
