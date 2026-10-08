import type { ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderHero, type HeroProps } from '@commercetools-demo/puck-components';
import { createFontSizeField } from '../fields/fontSizeField';
import { createHeroHeightField } from '../fields/sizeFields';

export type { HeroProps };

export const createHeroConfig = (intl: IntlShape): ComponentConfig<HeroProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.hero.label' }),
  fields: {
    heading: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.hero.field.heading' }) },
    headingFontSize: createFontSizeField(intl, intl.formatMessage({ id: 'Editor.cfg.hero.field.headingFontSize' })),
    subheading: { type: 'textarea', label: intl.formatMessage({ id: 'Editor.cfg.hero.field.subheading' }) },
    subheadingFontSize: createFontSizeField(intl, intl.formatMessage({ id: 'Editor.cfg.hero.field.subheadingFontSize' })),
    backgroundImage: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.hero.field.backgroundImage' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.hero.field.ctaText' }) },
    ctaUrl: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.hero.field.ctaUrl' }) },
    layout: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.hero.field.layout' }),
      options: [
        { value: 'centered', label: intl.formatMessage({ id: 'Editor.cfg.hero.layout.centered' }) },
        { value: 'left-aligned', label: intl.formatMessage({ id: 'Editor.cfg.hero.layout.leftAligned' }) },
      ],
    },
    minHeight: createHeroHeightField(intl.formatMessage({ id: 'Editor.cfg.hero.field.minHeight' })),
  },
  defaultProps: {
    heading: 'Welcome',
    layout: 'centered',
    minHeight: '400px',
  },
  render: renderHero,
});
