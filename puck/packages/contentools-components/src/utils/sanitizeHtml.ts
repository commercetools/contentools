import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize rich-text HTML before it is injected via dangerouslySetInnerHTML.
 *
 * RichText/TextBlock/Card store author-controlled HTML produced by the TipTap
 * editor, but content can also arrive from imports or older data, so we always
 * sanitize at render time. isomorphic-dompurify works in both the browser and
 * during SSR, so this is safe wherever the renderer runs.
 *
 * `style` and `class` are allowed because the editor emits inline styles
 * (e.g. font-size from the typography control) and structural classes.
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
};
