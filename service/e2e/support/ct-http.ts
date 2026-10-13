/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** Minimal commercetools HTTP client for the live e2e harness (token + custom objects), built on Node fetch. */
import { assertSandbox } from './sandbox-guard';

export interface CtObject {
  id: string;
  version: number;
  container: string;
  key: string;
  value: unknown;
}

let cached: { token: string; at: number } | undefined;

async function token(): Promise<string> {
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.token;
  const env = process.env;
  const basic = Buffer.from(`${env.CTP_CLIENT_ID}:${env.CTP_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${env.CTP_AUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: env.CTP_SCOPE as string }),
  });
  if (!res.ok) throw new Error(`e2e: token request failed (${res.status})`);
  cached = { token: ((await res.json()) as { access_token: string }).access_token, at: Date.now() };
  return cached.token;
}

/** Calls the project API. Refuses to run unless the sandbox guard passes. */
export async function ctFetch(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ status: number; body: any }> {
  assertSandbox();
  const env = process.env;
  const res = await fetch(`${env.CTP_API_URL}/${env.CTP_PROJECT_KEY}${path}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

export const putObject = (container: string, key: string, value: unknown) =>
  ctFetch('/custom-objects', { method: 'POST', body: { container, key, value } });
export const getObject = (container: string, key: string) =>
  ctFetch(`/custom-objects/${encodeURIComponent(container)}/${encodeURIComponent(key)}`);
export const deleteObject = (container: string, key: string) =>
  ctFetch(`/custom-objects/${encodeURIComponent(container)}/${encodeURIComponent(key)}`, { method: 'DELETE' });
