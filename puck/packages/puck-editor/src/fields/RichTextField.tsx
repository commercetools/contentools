import React from 'react';
import { useIntl } from 'react-intl';
import { type CustomField } from '@measured/puck';
import { RichTextInput } from '@commercetools/nimbus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RichTextFieldProps {
  /** HTML string. */
  value: string | undefined;
  onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// RichTextField — custom Puck field component (HTML in / HTML out)
//
// Thin wrapper around Nimbus `RichTextInput`, which accepts and emits HTML
// strings (converting to/from its internal Slate representation). The props
// contract is unchanged, so every consumer (the RichText block and the cms/*
// components) keeps working without modification, and stored page data needs
// no migration.
// ---------------------------------------------------------------------------

export const RichTextField: React.FC<RichTextFieldProps> = ({ value, onChange }) => {
  const intl = useIntl();
  return (
    <RichTextInput
      value={value ?? ''}
      onChange={onChange}
      placeholder={intl.formatMessage({ id: 'Editor.richTextPlaceholder' })}
    />
  );
};

/**
 * Puck `custom` field config that renders a rich-text editor (HTML in / out).
 * Use in a component's `fields` for any prop that holds an HTML string, e.g.
 *   fields: { body: richTextField('Body') }
 */
export const richTextField = (label: string): CustomField<string> => ({
  type: 'custom',
  label,
  render: ({ value, onChange }) => (
    <RichTextField value={value} onChange={onChange} />
  ),
});
