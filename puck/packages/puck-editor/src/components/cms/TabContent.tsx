import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderTabContent, type TabContentProps } from '@commercetools-demo/puck-components';
import { richTextField } from '../../fields/RichTextField';

export type { TabContentProps };

export const createTabContentConfig = (
  intl: IntlShape
): ComponentConfig<TabContentProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.tabContent.label' }),
  fields: {
    tabLabel: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.tabContent.field.tabLabel' }) },
    content: richTextField(intl.formatMessage({ id: 'Editor.cfg.tabContent.field.content' })),
  },
  defaultProps: { tabLabel: '', content: '' },
  render: renderTabContent,
});
