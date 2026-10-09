/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import type { ServiceRequest } from './types';

export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface ClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

const MAX_MESSAGE = 500;

function describeFailure(status: number, raw: string): string {
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
      const code = typeof parsed.code === 'string' ? ` ${parsed.code}` : '';
      const cid =
        typeof parsed.correlationId === 'string'
          ? ` (correlationId ${parsed.correlationId})`
          : '';
      const errors =
        parsed.errors !== undefined ? ` ${JSON.stringify(parsed.errors)}` : '';
      return `Service returned ${status}${code}: ${parsed.message}${cid}${errors}`.slice(
        0,
        MAX_MESSAGE
      );
    }
  } catch {
    // not JSON: fall through to the raw text
  }
  detail = raw.trim();
  return `Service returned ${status}${detail ? `: ${detail}` : ''}`.slice(0, MAX_MESSAGE);
}

export class ContentoolsClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? ((...a) => fetch(...a));
  }

  async execute(req: ServiceRequest, correlationId?: string): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'x-source': 'mcp',
      Accept: 'application/json',
    };
    if (correlationId) headers['x-correlation-id'] = correlationId;

    let body: BodyInit | undefined;
    if (req.multipart) {
      const form = new FormData();
      for (const [k, v] of Object.entries(req.multipart.fields)) form.append(k, v);
      if (req.multipart.file) {
        form.append(
          'file',
          new Blob([Buffer.from(req.multipart.file.contentBase64, 'base64')]),
          req.multipart.file.name
        );
      }
      body = form;
    } else if (req.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(req.body);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${req.path}`, {
        method: req.method,
        headers,
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      const name = (e as { name?: string } | null)?.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ServiceError(
          504,
          `Service request timed out after ${this.timeoutMs} ms`
        );
      }
      throw new ServiceError(502, 'Service is unreachable');
    }

    const text = await res.text().catch(() => '');
    if (!res.ok) throw new ServiceError(res.status, describeFailure(res.status, text));
    if (text === '') return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
