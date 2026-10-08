import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCountdownBanner, type CountdownBannerProps } from '@commercetools-demo/puck-components';
import { ColorPickerField } from '../../fields/ColorPickerField';

export type { CountdownBannerProps };

export const createCountdownBannerConfig = (
  intl: IntlShape
): ComponentConfig<CountdownBannerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.label' }),
  fields: {
    headline: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.headline' }) },
    subline: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.subline' }) },
    endDate: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.endDate' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.ctaLink' }) },
    background: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.countdownBanner.field.background' }),
      render: ({ value, onChange }) => <ColorPickerField value={value} onChange={onChange} />,
    },
  },
  defaultProps: {
    headline: '', subline: '', endDate: '', ctaText: '', ctaLink: '', background: '#2c5530',
  },
  render: renderCountdownBanner,
});
