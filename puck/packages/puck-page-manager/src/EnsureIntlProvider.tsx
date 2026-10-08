import React, { useContext, type PropsWithChildren } from 'react';
import { IntlContext, IntlProvider, ReactIntlErrorCode } from 'react-intl';
import { intlCatalogs as editorCatalogs } from '@commercetools-demo/puck-editor';
import { intlCatalogs as versionHistoryCatalogs } from '@commercetools-demo/puck-version-history';
import { catalogs as pageManagerCatalogs } from './intl';

/**
 * Ensures a react-intl context exists and is populated with this package's
 * message catalogs for the given `locale`.
 *
 * Two jobs:
 *  1. The commercetools UIKit components rendered here call react-intl
 *     internally and require an `<IntlProvider>` in the ancestry.
 *  2. This package's own strings (defined via `defineMessages`) are resolved
 *     from per-package catalogs merged here.
 *
 * Locale handling: only `en` and `es` are shipped. A full locale falls back to
 * its language — `en-US` → `en`, `es-PE` → `es`; anything else → `en`.
 *
 * Messages are merged (last wins): any parent IntlProvider's messages (e.g. a
 * host Merchant Center shell) → the bundled per-package catalogs → the optional
 * `messageOverrides` prop. Merging the parent's messages beneath ours preserves
 * a host's UIKit translations while adding our app strings on top.
 */

type Lang = 'en' | 'es';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'es'];
const DEFAULT_LANG: Lang = 'en';

/**
 * Per-package catalogs merged into the provider, in precedence order (later
 * wins). Covers every package rendered in this tree: the editor and version
 * history render inside it, so their strings resolve here too.
 */
const CATALOG_SOURCES: ReadonlyArray<Record<string, Record<string, string>>> = [
  editorCatalogs,
  versionHistoryCatalogs,
  pageManagerCatalogs,
];

export function resolveLang(locale?: string): Lang {
  const lang = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? (lang as Lang)
    : DEFAULT_LANG;
}

export interface EnsureIntlProviderProps {
  /** Content locale (e.g. "en-US"). Resolves to en/es; unsupported → en. */
  locale?: string;
  /** Per-key message overrides applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

export const EnsureIntlProvider: React.FC<
  PropsWithChildren<EnsureIntlProviderProps>
> = ({ locale, messageOverrides, children }) => {
  const parent = useContext(IntlContext);
  const lang = resolveLang(locale);

  const messages: Record<string, string> = Object.assign(
    { ...((parent?.messages as Record<string, string>) ?? {}) },
    // English base first (fallback for untranslated keys — there is no
    // per-message defaultMessage anymore), then the resolved-locale catalog.
    ...CATALOG_SOURCES.map((source) => source.en),
    ...(lang === 'en' ? [] : CATALOG_SOURCES.map((source) => source[lang])),
    messageOverrides ?? {}
  );

  return (
    <IntlProvider
      locale={locale || lang}
      defaultLocale={DEFAULT_LANG}
      messages={messages}
      onError={(err) => {
        // Missing translations fall back to each message's `defaultMessage`
        // (and UIKit ships its own defaults), so this is expected — don't flood.
        if (err.code === ReactIntlErrorCode.MISSING_TRANSLATION) return;
        // eslint-disable-next-line no-console
        console.error(err);
      }}
    >
      {children}
    </IntlProvider>
  );
};
