/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Resolved context for a single request: projectKey, businessUnitKey, jwtToken
 * from authConfig + configuration.context + per-call arg overrides.
 */
export type ResolvedContext = {
  baseUrl: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken?: string;
};

function resolveContext(
  baseUrl: string,
  projectKey: string,
  businessUnitKey: string | undefined,
  jwtToken: string | undefined,
  arg: Record<string, unknown>
): ResolvedContext {
  return {
    baseUrl,
    projectKey: (arg.projectKey as string) ?? projectKey,
    businessUnitKey: (arg.businessUnitKey as string) ?? businessUnitKey ?? 'default',
    jwtToken: (arg.jwtToken as string) ?? jwtToken,
  };
}

function headers(ctx: ResolvedContext, useAuth: boolean): Record<string, string> {
  const h: Record<string, string> = {
    'x-project-key': ctx.projectKey,
    'Content-Type': 'application/json',
    'x-source': 'mcp',  // lets the service log which client sent the request
  };
  if (useAuth && ctx.jwtToken) {
    h['Authorization'] = `Bearer ${ctx.jwtToken}`;
  }
  return h;
}

async function request<T = unknown>(
  ctx: ResolvedContext,
  method: string,
  path: string,
  useAuth: boolean,
  body?: unknown
): Promise<T> {
  const url = ctx.baseUrl.replace(/\/$/, '') + path;
  const res = await fetch(url, {
    method,
    headers: headers(ctx, useAuth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${method} ${path}: ${res.status} ${text}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export type FunctionMap = Record<string, (ctx: ResolvedContext, arg: Record<string, unknown>) => Promise<unknown>>;

export function createFunctionMap(
  baseUrl: string,
  projectKey: string,
  businessUnitKey: string | undefined,
  jwtToken: string | undefined
): FunctionMap {
  const r = (arg: Record<string, unknown>) =>
    resolveContext(baseUrl, projectKey, businessUnitKey, jwtToken, arg);

  return {
    // --- Configuration ---
    get_theme: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/theme`, false);
    },
    create_theme: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/theme`, true, { value: arg.value });
    },
    update_theme: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/theme`, true, { value: arg.value });
    },
    delete_theme: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/theme`, true);
    },
    get_all_configurations: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration`, false);
    },
    get_header: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/header`, false);
    },
    create_header: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/header`, true, { value: arg.value });
    },
    update_header: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/header`, true, { value: arg.value });
    },
    delete_header: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/header`, true);
    },
    get_facet: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/facet`, false);
    },
    create_facet: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/facet`, true, { value: arg.value });
    },
    update_facet: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/facet`, true, { value: arg.value });
    },
    delete_facet: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/facet`, true);
    },
    get_footer: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/footer`, false);
    },
    create_footer: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/footer`, true, { value: arg.value });
    },
    update_footer: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/footer`, true, { value: arg.value });
    },
    delete_footer: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/footer`, true);
    },
    get_site_metadata: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/site-metadata`, false);
    },
    create_site_metadata: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/site-metadata`, true, { value: arg.value });
    },
    update_site_metadata: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/site-metadata`, true, { value: arg.value });
    },
    delete_site_metadata: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/site-metadata`, true);
    },
    get_category_listing: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/category-listing`, false);
    },
    create_category_listing: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/category-listing`, true, { value: arg.value });
    },
    update_category_listing: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/category-listing`, true, { value: arg.value });
    },
    delete_category_listing: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/category-listing`, true);
    },
    get_translations: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/translations`, false);
    },
    create_translations: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/translations`, true, { value: arg.value });
    },
    update_translations: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/translations`, true, { value: arg.value });
    },
    delete_translations: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/translations`, true);
    },
    get_b2b_account_menu_links: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/configuration/b2b-account-menu-links`, false);
    },
    create_b2b_account_menu_links: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/configuration/b2b-account-menu-links`, true, { value: arg.value });
    },
    update_b2b_account_menu_links: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/configuration/b2b-account-menu-links`, true, { value: arg.value });
    },
    delete_b2b_account_menu_links: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/configuration/b2b-account-menu-links`, true);
    },

    // --- Content type ---
    import_content_types: async (ctx) => {
      return request(ctx, 'POST', '/content-type/import', true, {});
    },

    // --- Datasource ---
    list_datasources: async (ctx) => {
      return request(ctx, 'GET', '/datasource', false);
    },
    get_datasource: async (ctx, arg) => {
      return request(ctx, 'GET', `/datasource/${encodeURIComponent((arg.key as string) || '')}`, false);
    },
    create_datasource: async (ctx, arg) => {
      return request(ctx, 'POST', `/datasource/${encodeURIComponent((arg.key as string) || '')}`, true, {
        value: arg.value,
      });
    },
    update_datasource: async (ctx, arg) => {
      return request(ctx, 'PUT', `/datasource/${encodeURIComponent((arg.key as string) || '')}`, true, {
        value: arg.value,
      });
    },
    delete_datasource: async (ctx, arg) => {
      return request(ctx, 'DELETE', `/datasource/${encodeURIComponent((arg.key as string) || '')}`, true);
    },
    test_datasource: async (ctx, arg) => {
      return request(ctx, 'POST', `/datasource/${encodeURIComponent((arg.key as string) || '')}/test`, true, {
        params: arg.params,
      });
    },

    // --- File ---
    upload_file: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const url = ctx.baseUrl.replace(/\/$/, '') + `/${encodeURIComponent(bu)}/upload-file`;
      const formData = new FormData();
      formData.append('title', (arg.title as string) ?? '');
      formData.append('description', (arg.description as string) ?? '');
      if (arg.fileContent != null && typeof arg.fileContent === 'string') {
        const bin = Buffer.from(arg.fileContent as string, 'base64');
        formData.append('file', new Blob([bin]), (arg.fileName as string) || 'file');
      }
      const h: Record<string, string> = { 'x-project-key': ctx.projectKey };
      if (ctx.jwtToken) h['Authorization'] = `Bearer ${ctx.jwtToken}`;
      const res = await fetch(url, { method: 'POST', headers: h, body: formData });
      if (!res.ok) throw new Error(`upload_file: ${res.status} ${await res.text()}`);
      return res.json();
    },
    get_media_library: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const page = (arg.page as number) ?? 1;
      const limit = (arg.limit as number) ?? 20;
      const ext = arg.extensions as string[] | undefined;
      const q = new URLSearchParams();
      if (page != null) q.set('page', String(page));
      if (limit != null) q.set('limit', String(limit));
      if (ext?.length) q.set('extensions', ext.join(','));
      const query = q.toString() ? `?${q.toString()}` : '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/media-library${query}`, false);
    },
  };
}
