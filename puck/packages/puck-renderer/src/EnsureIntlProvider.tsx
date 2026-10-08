import React, { useContext, type PropsWithChildren } from 'react';
import { IntlContext, IntlProvider, ReactIntlErrorCode } from 'react-intl';
// Catalogs come from the Nimbus-free render package.
import { intlCatalogs as editorCatalogs } from '@commercetools-demo/puck-components';

/**
 * Ensures a react-intl context exists for the rendered Puck components.
 *
 * The components in the render config call react-intl internally (`useIntl` /
 * `<FormattedMessage>`) and require an `<IntlProvider>` in the ancestry. The
 * editor supplies one; a storefront rendering published content via
 * `PuckDataRenderer` / `PuckRenderer` does not — so this wrapper provides it,
 * seeded with the editor's own message catalogs. Without it, rendering throws:
 * "[React Intl] Could not find required `intl` object. <IntlProvider> needs to
 * exist in the component ancestry."
 *
 * Note: this always provides a react-intl context. A host's `next-intl` provider
 * does NOT populate react-intl's `IntlContext`, so we can't rely on it. Where a
 * parent react-intl provider does exist, its messages are merged beneath ours so
 * host translations are preserved.
 *
 * Locale handling: only `en` and `es` are shipped. A full locale falls back to
 * its language — `en-US` → `en`, `es-PE` → `es`; anything else → `en`.
 */

type Lang = 'en' | 'es';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'es'];
const DEFAULT_LANG: Lang = 'en';

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
    // English base first (fallback for untranslated keys), then the
    // resolved-locale catalog, then any explicit overrides.
    editorCatalogs.en,
    ...(lang === 'en' ? [] : [editorCatalogs[lang]]),
    messageOverrides ?? {}
  );

  return (
    <IntlProvider
      locale={locale || lang}
      defaultLocale={DEFAULT_LANG}
      messages={messages}
      onError={(err) => {
        // Missing translations fall back to the English base above, so this is
        // expected — don't flood the console.
        if (err.code === ReactIntlErrorCode.MISSING_TRANSLATION) return;
        // eslint-disable-next-line no-console
        console.error(err);
      }}
    >
      {children}
    </IntlProvider>
  );
};
