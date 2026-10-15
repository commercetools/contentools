import React from 'react';
import { useIntl, type IntlShape } from 'react-intl';

// ---------------------------------------------------------------------------
// Friendly colour field
//
// Theme tokens can be any brand colour, so we keep a fully visual picker (the
// browser's native colour wheel) rather than restricting to a fixed palette.
// The key requirement is that no hexadecimal is ever shown to the editor: we
// display a colour swatch plus a human-friendly name instead.
// ---------------------------------------------------------------------------

interface NamedColor {
  nameId: string;
  value: string;
}

const PALETTE: NamedColor[] = [
  { nameId: 'ThemeManager.color.white', value: '#FFFFFF' },
  { nameId: 'ThemeManager.color.lightGray', value: '#F1F3F5' },
  { nameId: 'ThemeManager.color.gray', value: '#CED4DA' },
  { nameId: 'ThemeManager.color.slate', value: '#6C757D' },
  { nameId: 'ThemeManager.color.charcoal', value: '#343A40' },
  { nameId: 'ThemeManager.color.black', value: '#212529' },
  { nameId: 'ThemeManager.color.red', value: '#E94560' },
  { nameId: 'ThemeManager.color.orange', value: '#F76707' },
  { nameId: 'ThemeManager.color.amber', value: '#F59F00' },
  { nameId: 'ThemeManager.color.yellow', value: '#FCC419' },
  { nameId: 'ThemeManager.color.lime', value: '#82C91E' },
  { nameId: 'ThemeManager.color.green', value: '#2C5530' },
  { nameId: 'ThemeManager.color.teal', value: '#0CA678' },
  { nameId: 'ThemeManager.color.cyan', value: '#22B8CF' },
  { nameId: 'ThemeManager.color.skyBlue', value: '#4DABF7' },
  { nameId: 'ThemeManager.color.blue', value: '#1C7ED6' },
  { nameId: 'ThemeManager.color.navy', value: '#1A1A2E' },
  { nameId: 'ThemeManager.color.purple', value: '#7048E8' },
  { nameId: 'ThemeManager.color.pink', value: '#E64980' },
  { nameId: 'ThemeManager.color.sand', value: '#F5E6C8' },
];

const friendlyName = (intl: IntlShape, value: string): string => {
  const preset = PALETTE.find(
    (c) => c.value.toLowerCase() === value.trim().toLowerCase()
  );
  return preset
    ? intl.formatMessage({ id: preset.nameId })
    : intl.formatMessage({ id: 'ThemeManager.color.custom' });
};

export interface ColorFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  /** Colour used for the swatch when no value is set yet. */
  fallback?: string;
}

export const ColorField: React.FC<ColorFieldProps> = ({
  label,
  value,
  onChange,
  fallback = '#000000',
}) => {
  const intl = useIntl();
  const current = value && value.trim() !== '' ? value : fallback;
  const name = friendlyName(intl, current);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
        {label}
      </div>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 40,
            height: 32,
            borderRadius: 6,
            background: current,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: '#374151' }}>{name}</span>
        <input
          type="color"
          aria-label={label}
          value={current}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </label>
    </div>
  );
};
