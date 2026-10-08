import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCategoryHero, type CategoryHeroProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { CategoryHeroProps };

export const createCategoryHeroConfig = (
  intl: IntlShape
): ComponentConfig<CategoryHeroProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.field.subtitle' }) },
    image: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.field.image' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.categoryHero.field.ctaLink' }) },
  },
  defaultProps: { title: '', subtitle: '', image: '', ctaText: '', ctaLink: '' },
  render: renderCategoryHero,
});
