import type { Field } from '@measured/puck';
import type { IntlShape } from 'react-intl';

/**
 * Reusable font-size control for plain-text component props (headings, labels,
 * etc.). This covers the text elements that aren't edited through the rich-text
 * editor (the Nimbus RichTextInput has no inline font-size control).
 *
 * The stored value is a CSS size string (e.g. "1.5rem"); the empty option means
 * "inherit the component default", so render with `value || defaultSize`.
 *
 * Factory form so the option labels resolve through react-intl; `label` is the
 * (already-localized) field label supplied by the caller.
 */
export const createFontSizeField = (intl: IntlShape, label: string): Field => ({
  type: 'select',
  label,
  options: [
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.default' }), value: '' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.small' }), value: '0.875rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.medium' }), value: '1rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.large' }), value: '1.25rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.xLarge' }), value: '1.5rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.2xLarge' }), value: '2rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.3xLarge' }), value: '2.5rem' },
    { label: intl.formatMessage({ id: 'Editor.cfg.fontSize.4xLarge' }), value: '3rem' },
  ],
});
