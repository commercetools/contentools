import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderFooterBlock, type FooterBlockProps } from '@commercetools-demo/puck-components';
import { richTextField } from '../../fields/RichTextField';

export type { FooterBlockProps };

export const createFooterBlockConfig = (
  intl: IntlShape
): ComponentConfig<FooterBlockProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.footerBlock.label' }),
  fields: {
    column1: richTextField(intl.formatMessage({ id: 'Editor.cfg.footerBlock.field.column' }, { n: 1 })),
    column2: richTextField(intl.formatMessage({ id: 'Editor.cfg.footerBlock.field.column' }, { n: 2 })),
    column3: richTextField(intl.formatMessage({ id: 'Editor.cfg.footerBlock.field.column' }, { n: 3 })),
    copyright: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.footerBlock.field.copyright' }) },
  },
  defaultProps: { column1: '', column2: '', column3: '', copyright: '' },
  render: renderFooterBlock,
});
