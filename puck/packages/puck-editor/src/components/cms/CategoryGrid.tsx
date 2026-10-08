import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCategoryGrid, type CategoryGridProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { CategoryGridProps };

const imgField = (label: string) => ({
  type: 'custom' as const,
  label,
  render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <ImagePickerField value={value ?? ''} onChange={onChange} />
  ),
});

export const createCategoryGridConfig = (
  intl: IntlShape
): ComponentConfig<CategoryGridProps> => {
  const imageLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.categoryGrid.field.image' }, { n });
  const labelLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.categoryGrid.field.label' }, { n });
  const linkLabel = (n: number) =>
    intl.formatMessage({ id: 'Editor.cfg.categoryGrid.field.link' }, { n });
  return {
  label: intl.formatMessage({ id: 'Editor.cfg.categoryGrid.label' }),
  fields: {
    category1Image: imgField(imageLabel(1)),
    category1Label: { type: 'text', label: labelLabel(1) },
    category1Link: { type: 'text', label: linkLabel(1) },
    category2Image: imgField(imageLabel(2)),
    category2Label: { type: 'text', label: labelLabel(2) },
    category2Link: { type: 'text', label: linkLabel(2) },
    category3Image: imgField(imageLabel(3)),
    category3Label: { type: 'text', label: labelLabel(3) },
    category3Link: { type: 'text', label: linkLabel(3) },
    category4Image: imgField(imageLabel(4)),
    category4Label: { type: 'text', label: labelLabel(4) },
    category4Link: { type: 'text', label: linkLabel(4) },
  },
  defaultProps: {
    category1Image: '', category1Label: '', category1Link: '',
    category2Image: '', category2Label: '', category2Link: '',
    category3Image: '', category3Label: '', category3Link: '',
    category4Image: '', category4Label: '', category4Link: '',
  },
  render: renderCategoryGrid,
  };
};
