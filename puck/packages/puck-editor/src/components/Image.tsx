import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderImage, type ImageProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../fields/ImagePickerField';
import { createWidthField, createImageHeightField, createRadiusField } from '../fields/sizeFields';

export type { ImageProps };

export const createImageConfig = (intl: IntlShape): ComponentConfig<ImageProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.image.label' }),
  fields: {
    src: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.image.field.src' }),
      render: ({ value, onChange }) => (
        <ImagePickerField
          value={value as string}
          onChange={onChange}
          imagesOnly={true}
        />
      ),
    },
    alt: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.image.field.alt' }) },
    caption: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.image.field.caption' }) },
    width: createWidthField(intl.formatMessage({ id: 'Editor.cfg.image.field.width' })),
    height: createImageHeightField(intl.formatMessage({ id: 'Editor.cfg.image.field.height' })),
    objectFit: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.image.field.objectFit' }),
      options: [
        { value: 'cover', label: intl.formatMessage({ id: 'Editor.cfg.image.objectFit.cover' }) },
        { value: 'contain', label: intl.formatMessage({ id: 'Editor.cfg.image.objectFit.contain' }) },
        { value: 'fill', label: intl.formatMessage({ id: 'Editor.cfg.image.objectFit.fill' }) },
      ],
    },
    borderRadius: createRadiusField(intl.formatMessage({ id: 'Editor.cfg.image.field.borderRadius' })),
    align: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.image.field.align' }),
      options: [
        { value: 'left', label: intl.formatMessage({ id: 'Editor.cfg.align.left' }) },
        { value: 'center', label: intl.formatMessage({ id: 'Editor.cfg.align.center' }) },
        { value: 'right', label: intl.formatMessage({ id: 'Editor.cfg.align.right' }) },
      ],
    },
  },
  defaultProps: {
    src: '',
    alt: '',
    width: '100%',
    objectFit: 'cover',
    align: 'center',
  },
  render: renderImage,
});
