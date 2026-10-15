import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { PuckFetcher } from '@commercetools-labs/contentools-types';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageManager } from './PageManager';
import de from './intl/de.json';

const emptyList: PuckFetcher = async () => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: (n) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) },
  text: async () => '[]',
  json: async () => [],
});

const renderManager = (locale: string) =>
  render(
    <PageManager
      parentUrl="/"
      baseURL="http://svc.test/service"
      businessUnitKey="main-store"
      locale={locale}
      fetcher={emptyList}
    />
  );

describe('PageManager locales', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders German for de-DE', async () => {
    renderManager('de-DE');
    expect(await screen.findByText(de['PageManager.pagesTitle'])).toBeInTheDocument();
    expect(screen.queryByText('Pages')).not.toBeInTheDocument();
  });

  it('falls back to English for an unsupported locale', async () => {
    renderManager('fr');
    expect(await screen.findByText('Pages')).toBeInTheDocument();
  });
});
