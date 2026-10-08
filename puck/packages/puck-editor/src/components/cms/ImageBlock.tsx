import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderImageBlock, type ImageBlockProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { ImageBlockProps };

export const createImageBlockConfig = (
  intl: IntlShape
): ComponentConfig<ImageBlockProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.imageBlock.label' }),
  fields: {
    image: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.imageBlock.field.image' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    caption: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.imageBlock.field.caption' }) },
    link: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.imageBlock.field.link' }) },
  },
  defaultProps: { image: '', caption: '', link: '' },
  render: renderImageBlock,
});
