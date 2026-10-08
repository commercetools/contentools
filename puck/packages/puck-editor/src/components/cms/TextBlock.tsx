import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderTextBlock, type TextBlockProps } from '@commercetools-demo/puck-components';
import { RichTextField } from '../../fields/RichTextField';

export type { TextBlockProps };

export const createTextBlockConfig = (
  intl: IntlShape
): ComponentConfig<TextBlockProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.textBlock.label' }),
  fields: {
    content: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.textBlock.field.content' }),
      render: ({ value, onChange }) => (
        <RichTextField value={value as string} onChange={onChange} />
      ),
    },
  },
  defaultProps: { content: '' },
  render: renderTextBlock,
});
