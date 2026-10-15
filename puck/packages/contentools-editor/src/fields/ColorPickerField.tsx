import React, { useRef } from 'react';
import { useIntl } from 'react-intl';

// ---------------------------------------------------------------------------
// Friendly colour palette
//
// A curated set of named colours so non-technical editors pick a colour by
// name/swatch instead of typing a hexadecimal code. The underlying stored
// value is still a colour string, but it is never *shown* to the editor.
// ---------------------------------------------------------------------------

export interface NamedColor {
  /** react-intl id for the human-friendly colour name */
  nameId: string;
  /** the colour value stored on the component */
  value: string;
}

export const COLOR_PALETTE: NamedColor[] = [
  { nameId: 'Editor.color.white', value: '#FFFFFF' },
  { nameId: 'Editor.color.lightGray', value: '#F1F3F5' },
  { nameId: 'Editor.color.gray', value: '#CED4DA' },
  { nameId: 'Editor.color.slate', value: '#6C757D' },
  { nameId: 'Editor.color.charcoal', value: '#343A40' },
  { nameId: 'Editor.color.black', value: '#212529' },
  { nameId: 'Editor.color.red', value: '#E94560' },
  { nameId: 'Editor.color.orange', value: '#F76707' },
  { nameId: 'Editor.color.amber', value: '#F59F00' },
  { nameId: 'Editor.color.yellow', value: '#FCC419' },
  { nameId: 'Editor.color.lime', value: '#82C91E' },
  { nameId: 'Editor.color.green', value: '#2C5530' },
  { nameId: 'Editor.color.teal', value: '#0CA678' },
  { nameId: 'Editor.color.cyan', value: '#22B8CF' },
  { nameId: 'Editor.color.skyBlue', value: '#4DABF7' },
  { nameId: 'Editor.color.blue', value: '#1C7ED6' },
  { nameId: 'Editor.color.navy', value: '#1A1A2E' },
  { nameId: 'Editor.color.purple', value: '#7048E8' },
  { nameId: 'Editor.color.pink', value: '#E64980' },
  { nameId: 'Editor.color.sand', value: '#F5E6C8' },
];

const findPreset = (value?: string): NamedColor | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return COLOR_PALETTE.find((c) => c.value.toLowerCase() === normalized);
};

export interface ColorPickerFieldProps {
  value?: string;
  onChange: (value: string) => void;
  /** Show a "None" swatch that clears the colour (for optional backgrounds). */
  allowNone?: boolean;
}

/**
 * A colour picker aimed at a non-technical audience: pick from named swatches,
 * or open the visual "custom colour" picker. No hexadecimal is ever shown.
 */
export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  value,
  onChange,
  allowNone = false,
}) => {
  const intl = useIntl();
  const customInputRef = useRef<HTMLInputElement>(null);

  const preset = findPreset(value);
  const hasValue = !!value && value.trim() !== '';
  const isCustom = hasValue && !preset;

  const selectedName = preset
    ? intl.formatMessage({ id: preset.nameId })
    : isCustom
      ? intl.formatMessage({ id: 'Editor.color.custom' })
      : intl.formatMessage({ id: 'Editor.color.none' });

  const swatchBase: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    padding: 0,
    boxSizing: 'border-box',
    position: 'relative',
    transition: 'transform .1s ease, box-shadow .1s ease',
  };

  const selectedRing = (selected: boolean): React.CSSProperties =>
    selected
      ? { boxShadow: '0 0 0 2px #fff, 0 0 0 4px #3b82f6' }
      : { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' };

  const checkMark = (dark: boolean) => (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: dark ? '#fff' : '#111',
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      ✓
    </span>
  );

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))',
          gap: 8,
        }}
      >
        {allowNone && (
          <button
            type="button"
            title={intl.formatMessage({ id: 'Editor.color.none' })}
            aria-label={intl.formatMessage({ id: 'Editor.color.none' })}
            aria-pressed={!hasValue}
            onClick={() => onChange('')}
            style={{
              ...swatchBase,
              background:
                'linear-gradient(135deg, #fff 45%, #e5484d 46%, #e5484d 54%, #fff 55%)',
              border: 'none',
              ...selectedRing(!hasValue),
            }}
          >
            {!hasValue && checkMark(false)}
          </button>
        )}

        {COLOR_PALETTE.map((color) => {
          const name = intl.formatMessage({ id: color.nameId });
          const selected = preset?.value === color.value;
          // Pick a legible checkmark colour for light vs dark swatches.
          const isLight = ['#FFFFFF', '#F1F3F5', '#F5E6C8', '#FCC419', '#82C91E'].includes(
            color.value
          );
          return (
            <button
              key={color.value}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={selected}
              onClick={() => onChange(color.value)}
              style={{
                ...swatchBase,
                background: color.value,
                border: 'none',
                ...selectedRing(selected),
              }}
            >
              {selected && checkMark(!isLight)}
            </button>
          );
        })}

        {/* Custom colour: opens the browser's visual colour picker. */}
        <button
          type="button"
          title={intl.formatMessage({ id: 'Editor.color.custom' })}
          aria-label={intl.formatMessage({ id: 'Editor.color.custom' })}
          aria-pressed={isCustom}
          onClick={() => customInputRef.current?.click()}
          style={{
            ...swatchBase,
            background: isCustom
              ? (value as string)
              : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            border: 'none',
            ...selectedRing(isCustom),
          }}
        >
          {isCustom && checkMark(true)}
        </button>
        <input
          ref={customInputRef}
          type="color"
          value={isCustom ? (value as string) : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-hidden
          tabIndex={-1}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>{selectedName}</div>
    </div>
  );
};
