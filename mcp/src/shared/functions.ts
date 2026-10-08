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
    // --- Auth ---
    authenticate_project: async (_, arg) => {
      return request(
        { ...r(arg), projectKey: (arg.ct_project_key as string) || projectKey },
        'POST',
        '/authenticate-project',
        false,
        {
          ct_client_id: arg.ct_client_id,
          ct_client_secret: arg.ct_client_secret,
          ct_project_key: arg.ct_project_key,
          ct_region: arg.ct_region,
          ct_scope: arg.ct_scope,
        }
      );
    },
    refresh_jwt: async (ctx) => {
      return request(ctx, 'POST', '/refresh-jwt', true);
    },
    health: async (ctx) => {
      return request(ctx, 'GET', '/health', false);
    },

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
    list_content_types: async (ctx) => {
      return request(ctx, 'GET', '/content-type', false);
    },
    get_content_type: async (ctx, arg) => {
      return request(ctx, 'GET', `/content-type/${encodeURIComponent((arg.key as string) || '')}`, false);
    },
    create_content_type: async (ctx, arg) => {
      return request(ctx, 'POST', '/content-type', true, { value: arg.value });
    },
    update_content_type: async (ctx, arg) => {
      return request(ctx, 'PUT', `/content-type/${encodeURIComponent((arg.key as string) || '')}`, true, {
        value: arg.value,
      });
    },
    delete_content_type: async (ctx, arg) => {
      return request(ctx, 'DELETE', `/content-type/${encodeURIComponent((arg.key as string) || '')}`, true);
    },
    import_content_types: async (ctx) => {
      return request(ctx, 'POST', '/content-type/import', true, {});
    },

    // --- Content item ---
    get_content_items: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/content-items`, false);
    },
    get_content_items_by_type: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const ct = (arg.contentType as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/content-items/content-type/${encodeURIComponent(ct)}`, false);
    },
    get_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}`, false);
    },
    get_published_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/published/content-items/${encodeURIComponent(key)}`, false);
    },
    get_preview_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/preview/content-items/${encodeURIComponent(key)}`, false);
    },
    query_published_content_items: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/published/content-items/query`, false, {
        query: arg.query,
      });
    },
    query_preview_content_items: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/preview/content-items/query`, false, {
        query: arg.query,
      });
    },
    create_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/content-items`, true, { value: arg.value });
    },
    update_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}`, true, {
        value: arg.value,
      });
    },
    delete_content_item: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}`, true);
    },

    // --- Content item version ---
    get_content_item_versions: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}/versions`, false);
    },

    // --- Content item state ---
    get_content_item_states: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}/states`, false);
    },
    create_content_item_published_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const path = `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}/states/published`;
      const q = arg.clearDraft === true ? '?clearDraft=true' : '';
      return request(ctx, 'PUT', path + q, true, { value: arg.value });
    },
    delete_content_item_draft_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(
        ctx,
        'DELETE',
        `/${encodeURIComponent(bu)}/content-items/${encodeURIComponent(key)}/states/draft`,
        true
      );
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
    compile_upload: async (ctx, arg) => {
      return request(ctx, 'POST', '/compile-upload', true, { files: arg.files, key: arg.key });
    },

    // --- Page ---
    get_pages: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/pages`, false);
    },
    get_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}`, false);
    },
    create_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/pages`, true, { value: arg.value });
    },
    update_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'PUT', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}`, true, {
        value: arg.value,
      });
    },
    delete_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'DELETE', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}`, true);
    },
    query_published_pages: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/published/pages/query`, false, {
        query: arg.query,
      });
    },
    query_preview_pages: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/preview/pages/query`, false, {
        query: arg.query,
      });
    },
    get_published_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/published/pages/${encodeURIComponent(key)}`, false);
    },
    get_preview_page: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/preview/pages/${encodeURIComponent(key)}`, false);
    },

    // --- Page version ---
    get_page_versions: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/versions`, false);
    },

    // --- Page state ---
    get_page_states: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/states`, false);
    },
    create_page_published_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const path = `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/states/published`;
      const q = arg.clearDraft === true ? '?clearDraft=true' : '';
      return request(ctx, 'PUT', path + q, true, { value: arg.value });
    },
    delete_page_draft_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(
        ctx,
        'DELETE',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/states/draft`,
        true
      );
    },

    // --- Page row ---
    add_page_row: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/rows`, true);
    },
    remove_page_row: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const rowId = (arg.rowId as string) || '';
      return request(
        ctx,
        'DELETE',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/rows/${encodeURIComponent(rowId)}`,
        true
      );
    },
    update_page_cell_span: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const rowId = (arg.rowId as string) || '';
      const cellId = (arg.cellId as string) || '';
      return request(
        ctx,
        'PUT',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/rows/${encodeURIComponent(rowId)}/cells/${encodeURIComponent(cellId)}`,
        true,
        { updates: arg.updates }
      );
    },

    // --- Page content item state ---
    get_page_item_states: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'GET', `/${encodeURIComponent(bu)}/page-items/${encodeURIComponent(key)}/states`, false);
    },
    create_page_item_published_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const path = `/${encodeURIComponent(bu)}/page-items/${encodeURIComponent(key)}/states/published`;
      const q = arg.clearDraft === true ? '?clearDraft=true' : '';
      return request(ctx, 'PUT', path + q, true, { value: arg.value });
    },
    delete_page_item_draft_state: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(
        ctx,
        'DELETE',
        `/${encodeURIComponent(bu)}/page-items/${encodeURIComponent(key)}/states/draft`,
        true
      );
    },

    // --- Page component ---
    add_page_component: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      return request(ctx, 'POST', `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/components`, true, {
        componentType: arg.componentType,
        rowId: arg.rowId,
        cellId: arg.cellId,
      });
    },
    move_page_component: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const contentItemKey = (arg.contentItemKey as string) || '';
      return request(
        ctx,
        'POST',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/components/${encodeURIComponent(contentItemKey)}/move`,
        true,
        {
          sourceRowId: arg.sourceRowId,
          sourceCellId: arg.sourceCellId,
          targetRowId: arg.targetRowId,
          targetCellId: arg.targetCellId,
        }
      );
    },
    update_page_component: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const contentItemKey = (arg.contentItemKey as string) || '';
      return request(
        ctx,
        'PUT',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/components/${encodeURIComponent(contentItemKey)}`,
        true,
        { updates: arg.updates }
      );
    },
    remove_page_component: async (ctx, arg) => {
      const bu = (arg.businessUnitKey as string) ?? ctx.businessUnitKey;
      const key = (arg.key as string) || '';
      const contentItemKey = (arg.contentItemKey as string) || '';
      return request(
        ctx,
        'DELETE',
        `/${encodeURIComponent(bu)}/pages/${encodeURIComponent(key)}/components/${encodeURIComponent(contentItemKey)}`,
        true
      );
    },

    // --- Proxy ---
    get_proxy_script: async (ctx, arg) => {
      const url = (arg.url as string) || '';
      const fullUrl = ctx.baseUrl.replace(/\/$/, '') + '/proxy-script?url=' + encodeURIComponent(url);
      const h: Record<string, string> = { 'x-project-key': ctx.projectKey };
      const res = await fetch(fullUrl, { method: 'GET', headers: h });
      if (!res.ok) throw new Error(`get_proxy_script: ${res.status}`);
      return { content: await res.text() };
    },
  };
}
