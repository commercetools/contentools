import type { ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderRichText, type RichTextProps } from '@commercetools-demo/puck-components';
import { RichTextField } from '../fields/RichTextField';
import { createContentWidthField, createSpacingField } from '../fields/sizeFields';

export type { RichTextProps };

export const createRichTextConfig = (intl: IntlShape): ComponentConfig<RichTextProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.richText.label' }),
  fields: {
    content: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.richText.field.content' }),
      render: ({ value, onChange }) => (
        <RichTextField value={value as string} onChange={onChange} />
      ),
    },
    align: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.richText.field.align' }),
      options: [
        { value: 'left', label: intl.formatMessage({ id: 'Editor.cfg.align.left' }) },
        { value: 'center', label: intl.formatMessage({ id: 'Editor.cfg.align.center' }) },
        { value: 'right', label: intl.formatMessage({ id: 'Editor.cfg.align.right' }) },
      ],
    },
    maxWidth: createContentWidthField(intl.formatMessage({ id: 'Editor.cfg.richText.field.maxWidth' })),
    padding: createSpacingField(intl.formatMessage({ id: 'Editor.cfg.richText.field.padding' })),
  },
  defaultProps: {
    content: '<p>Add your content here…</p>',
    align: 'left',
    padding: '32px',
  },
  render: renderRichText,
});
