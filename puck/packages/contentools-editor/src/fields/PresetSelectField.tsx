import React from 'react';
import { useIntl } from 'react-intl';
import type { Field } from '@measured/puck';

// ---------------------------------------------------------------------------
// Preset-size dropdown
//
// A dropdown for CSS-dimension props (width, spacing, corner rounding, …) aimed
// at a non-technical audience: editors pick a *named* size and never type a raw
// CSS value. The stored value is still the raw CSS string carried by the chosen
// option (`'48px'`, `'24'`, `'100%'`, `''`, …), so the render layer — shared
// with the storefront renderer — is completely unchanged.
//
// Any value that isn't one of the presets (e.g. a page authored before this
// control existed, or hand-tuned custom data) is preserved and surfaced as a
// "Custom (…)" entry, so switching a field to this control never loses data.
// This mirrors the ColorPickerField "custom colour" fallback. Kept Nimbus-free
// (plain HTML, like ColorPickerField) so it never pulls Nimbus into any build.
// ---------------------------------------------------------------------------

export interface PresetOption {
  /** react-intl id for the human-friendly option label (resolved at render). */
  labelId: string;
  /**
   * Raw value stored on the component, in the exact format that field's render
   * layer expects — a CSS length (`'48px'`), a percentage (`'100%'`), a unitless
   * number the renderer `parseInt`s (`'24'`), or `''` for the natural default.
   */
  value: string;
}

/** Puck's field-label wrapper (FieldLabelInternal), injected into custom fields. */
type LabelComp = React.ComponentType<{
  label?: string;
  el?: 'label' | 'div';
  readOnly?: boolean;
  children?: React.ReactNode;
}>;

export interface PresetSelectFieldProps {
  value?: string;
  onChange: (value: string) => void;
  options: PresetOption[];
  /** Label props Puck injects into a `custom` field's render at runtime. */
  label?: string;
  name?: string;
  id?: string;
  readOnly?: boolean;
  Label?: LabelComp;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  lineHeight: 1.4,
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  background: '#fff',
  color: '#18181b',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

export const PresetSelectField: React.FC<PresetSelectFieldProps> = ({
  value,
  onChange,
  options,
  label,
  name,
  id,
  readOnly,
  Label,
}) => {
  const intl = useIntl();
  const current = value ?? '';
  const matched = options.some((o) => o.value === current);
  const isEmpty = current === '';
  // A non-empty value that matches no preset is legacy/custom data: keep it.
  const showCustom = !matched && !isEmpty;
  // A <select>'s value must equal one of its <option> values. For an empty value
  // with no explicit empty option, display the first preset (the field's natural
  // default) without mutating the stored value until the editor actually picks.
  const selectValue = matched || showCustom ? current : options[0]?.value ?? '';

  const select = (
    <select
      id={id}
      style={selectStyle}
      value={selectValue}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {intl.formatMessage({ id: o.labelId })}
        </option>
      ))}
      {showCustom && (
        <option value={current}>
          {intl.formatMessage({ id: 'Editor.preset.custom' }, { value: current })}
        </option>
      )}
    </select>
  );

  // Reuse Puck's own label wrapper so the control looks like every other field.
  // `el="div"` avoids wrapping the interactive control in a <label>.
  if (!Label) return select;
  return (
    <Label label={label || name} el="div" readOnly={readOnly}>
      {select}
    </Label>
  );
};

/** Props Puck injects into a `custom` field's `render` at runtime (not in the public type). */
type CustomRenderProps = {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  id?: string;
  readOnly?: boolean;
  Label?: LabelComp;
};

/**
 * Build a Puck `custom` field that renders {@link PresetSelectField}. `label`
 * should already be localized by the caller (mirrors `createFontSizeField`).
 */
export const createPresetSelectField = (label: string, options: PresetOption[]): Field => ({
  type: 'custom',
  label,
  render: (props) => {
    const p = props as unknown as CustomRenderProps;
    return (
      <PresetSelectField
        value={p.value}
        onChange={p.onChange}
        options={options}
        label={p.label}
        name={p.name}
        id={p.id}
        readOnly={p.readOnly}
        Label={p.Label}
      />
    );
  },
});
