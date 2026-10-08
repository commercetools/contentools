import React, { useState } from 'react';
import { PageManager } from '@commercetools-demo/puck-page-manager';
import { ThemeManager } from '@commercetools-demo/puck-theme-manager';
import { ContentManager } from '@commercetools-demo/puck-content-manager';
import { PuckRenderer } from '@commercetools-demo/puck-renderer';

// ---------------------------------------------------------------------------
// Config from environment variables (.env file)
// ---------------------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_BASE_URL as string;
const PROJECT_KEY = import.meta.env.VITE_PROJECT_KEY as string;
const BUSINESS_UNIT_KEY = import.meta.env.VITE_BUSINESS_UNIT_KEY as string;
const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN as string;
// Content locale for locale-aware calls (e.g. product search). Defaults to en-US.
const LOCALE = (import.meta.env.VITE_LOCALE as string) || 'en-US';

// ---------------------------------------------------------------------------
// Config warning
// ---------------------------------------------------------------------------
const ConfigWarning: React.FC = () => (
  <div className="mx-auto w-full max-w-2xl px-6 py-12">
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-800">Configuration required</h3>
        <p className="text-sm leading-relaxed text-slate-600">
          Copy <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env</code> and fill in your API
          credentials before using this app.
        </p>
        <pre className="m-0 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {`VITE_BASE_URL=http://localhost:8080\nVITE_PROJECT_KEY=my-project\nVITE_BUSINESS_UNIT_KEY=my-bu\nVITE_JWT_TOKEN=your-jwt-token`}
        </pre>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Tab nav
// ---------------------------------------------------------------------------
type Tab = 'pages' | 'contents' | 'renderer' | 'theme';

const getInitialTab = (): Tab => {
  const path = window.location.pathname;
  if (path.startsWith('/content')) return 'contents';
  if (path.startsWith('/renderer')) return 'renderer';
  if (path.startsWith('/theme')) return 'theme';
  return 'pages';
};

interface TabNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const TabNav: React.FC<TabNavProps> = ({ activeTab, onChange }) => (
  <div
    style={{
      display: 'flex',
      borderBottom: '1px solid #e0e0e0',
      background: '#fff',
      padding: '0 24px',
    }}
  >
    {(['pages', 'contents', 'renderer', 'theme'] as Tab[]).map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        style={{
          padding: '12px 20px',
          border: 'none',
          borderBottom: activeTab === tab
            ? '3px solid #4a4ae0'
            : '3px solid transparent',
          marginBottom: '-1px',
          background: 'none',
          fontWeight: activeTab === tab ? 600 : 400,
          fontSize: '14px',
          color: activeTab === tab ? '#4a4ae0' : '#767676',
          cursor: 'pointer',
        }}
      >
        {tab === 'pages' ? 'Pages' : tab === 'contents' ? 'Content Items' : 'Renderer'}
      </button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Renderer panel
// ---------------------------------------------------------------------------

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 10px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  fontSize: '13px',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  background: '#fff',
  cursor: 'pointer',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#666',
  marginBottom: '4px',
  display: 'block',
};

interface RendererPanelProps {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
}

const RendererPanel: React.FC<RendererPanelProps> = ({ baseURL, projectKey, businessUnitKey }) => {
  const [type, setType] = useState<'page' | 'content'>('page');
  const [mode, setMode] = useState<'published' | 'preview'>('published');
  const [pageKey, setPageKey] = useState('');
  const [slug, setSlug] = useState('');
  const [contentKey, setContentKey] = useState('');
  const [query, setQuery] = useState('');
  const [renderKey, setRenderKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRender = () => {
    setRenderKey((k) => k + 1);
    setSubmitted(true);
  };

  const hasTarget = type === 'page'
    ? (pageKey.trim() !== '' || slug.trim() !== '')
    : (contentKey.trim() !== '' || query.trim() !== '');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-slate-800">Renderer</h1>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            {/* Type + Mode row */}
            <div className="flex flex-row gap-4">
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>Type</label>
                <select
                  style={SELECT_STYLE}
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as 'page' | 'content');
                    setSubmitted(false);
                  }}
                >
                  <option value="page">Page</option>
                  <option value="content">Content</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>Mode</label>
                <select
                  style={SELECT_STYLE}
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'published' | 'preview')}
                >
                  <option value="published">Published</option>
                  <option value="preview">Preview (draft)</option>
                </select>
              </div>
            </div>

            {/* Page fields */}
            {type === 'page' && (
              <div className="flex flex-row gap-4">
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Page Key</label>
                  <input
                    style={INPUT_STYLE}
                    type="text"
                    placeholder="e.g. home-page"
                    value={pageKey}
                    onChange={(e) => { setPageKey(e.target.value); setSlug(''); setSubmitted(false); }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Slug</label>
                  <input
                    style={INPUT_STYLE}
                    type="text"
                    placeholder="e.g. /home"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setPageKey(''); setSubmitted(false); }}
                  />
                </div>
              </div>
            )}

            {/* Content fields */}
            {type === 'content' && (
              <div className="flex flex-row gap-4">
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Content Key</label>
                  <input
                    style={INPUT_STYLE}
                    type="text"
                    placeholder="e.g. hero-banner"
                    value={contentKey}
                    onChange={(e) => { setContentKey(e.target.value); setQuery(''); setSubmitted(false); }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Query (content type)</label>
                  <input
                    style={INPUT_STYLE}
                    type="text"
                    placeholder="e.g. hero"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setContentKey(''); setSubmitted(false); }}
                  />
                </div>
              </div>
            )}

            <div>
              <button
                onClick={handleRender}
                disabled={!hasTarget}
                style={{
                  padding: '8px 20px',
                  borderRadius: '4px',
                  border: '1px solid #4a4ae0',
                  background: hasTarget ? '#4a4ae0' : '#e0e0e0',
                  color: hasTarget ? '#fff' : '#b3b3b3',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: hasTarget ? 'pointer' : 'not-allowed',
                }}
              >
                Render
              </button>
            </div>
          </div>
        </div>

        {submitted && hasTarget && (
          <div
            key={renderKey}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <PuckRenderer
              type={type}
              baseURL={baseURL}
              projectKey={projectKey}
              businessUnitKey={businessUnitKey}
              pageKey={type === 'page' ? (pageKey || undefined) : undefined}
              slug={type === 'page' ? (slug || undefined) : undefined}
              contentKey={type === 'content' ? (contentKey || undefined) : undefined}
              query={type === 'content' ? (query || undefined) : undefined}
              mode={mode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tailwind test banner
//
// Uses pure Tailwind utilities AND base elements (h1, p, ul/li, a, img, button)
// that Nimbus's global CSS reset would clobber if it leaked out of the puck
// packages. If these stay styled after mounting a puck manager tab, the reset
// isolation is working.
// ---------------------------------------------------------------------------
const TailwindTestBanner: React.FC = () => (
  <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white p-5">
    <div className="mx-auto flex max-w-4xl items-start gap-4">
      <img
        src="https://placehold.co/56x56/4f46e5/ffffff?text=TW"
        alt="Tailwind"
        className="h-14 w-14 rounded-lg shadow-md"
      />
      <div className="flex-1">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-indigo-700">
          Tailwind v4 test banner
        </h1>
        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          These elements are styled with plain Tailwind utilities. If a puck tab
          (Pages/Content/Theme) breaks their spacing, bullets, colors, or the
          image, Nimbus&rsquo;s reset is leaking. Everything below should stay
          intact.
        </p>
        <ul className="mb-3 list-disc space-y-1 pl-6 text-sm text-slate-700 marker:text-indigo-500">
          <li>Bulleted list item (needs list-style + left padding)</li>
          <li>
            An <a href="#" className="font-medium text-indigo-600 underline hover:text-indigo-800">inline link</a>{' '}
            with underline &amp; hover color
          </li>
        </ul>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          Tailwind-styled button
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);

  if (!BASE_URL || !PROJECT_KEY || !BUSINESS_UNIT_KEY) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}>
        <TailwindTestBanner />
        <ConfigWarning />
      </div>
    );
  }

  const sharedProps = {
    baseURL: BASE_URL,
    projectKey: PROJECT_KEY,
    businessUnitKey: BUSINESS_UNIT_KEY,
    jwtToken: JWT_TOKEN,
    locale: LOCALE,
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // const base = tab === 'pages' ? '/pages' : '/content';
    // window.history.pushState(null, '', base);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TailwindTestBanner />
      <TabNav activeTab={activeTab} onChange={handleTabChange} />
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'pages' && <PageManager {...sharedProps} parentUrl="/" />}
        {activeTab === 'contents' && <ContentManager {...sharedProps} parentUrl="/" />}
        {activeTab === 'theme' && <ThemeManager {...sharedProps}  />}
        {activeTab === 'renderer' && (
          <RendererPanel
            baseURL={BASE_URL}
            projectKey={PROJECT_KEY}
            businessUnitKey={BUSINESS_UNIT_KEY}
          />
        )}
      </div>
    </div>
  );
};

export default App;
