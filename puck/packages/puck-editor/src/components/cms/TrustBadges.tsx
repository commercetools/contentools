import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderTrustBadges, type TrustBadgesProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { TrustBadgesProps };

const iconField = (label: string) => ({
  type: 'custom' as const,
  label,
  render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <ImagePickerField value={value ?? ''} onChange={onChange} />
  ),
});

export const createTrustBadgesConfig = (
  intl: IntlShape
): ComponentConfig<TrustBadgesProps> => {
  const iconLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.trustBadges.field.icon' }, { n });
  const labelLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.trustBadges.field.label' }, { n });
  return {
  label: intl.formatMessage({ id: 'Editor.cfg.trustBadges.label' }),
  fields: {
    badge1Icon: iconField(iconLabel(1)),
    badge1Label: { type: 'text', label: labelLabel(1) },
    badge2Icon: iconField(iconLabel(2)),
    badge2Label: { type: 'text', label: labelLabel(2) },
    badge3Icon: iconField(iconLabel(3)),
    badge3Label: { type: 'text', label: labelLabel(3) },
    badge4Icon: iconField(iconLabel(4)),
    badge4Label: { type: 'text', label: labelLabel(4) },
  },
  defaultProps: {
    badge1Icon: '', badge1Label: '',
    badge2Icon: '', badge2Label: '',
    badge3Icon: '', badge3Label: '',
    badge4Icon: '', badge4Label: '',
  },
  render: renderTrustBadges,
  };
};
