import React, { useState } from 'react';
import { useIntl, type MessageDescriptor } from 'react-intl';
import type { ThemeTokens } from '@commercetools-demo/puck-types';
import { Button, Stack } from '@commercetools/nimbus';
import {
  themePresets,
  PRESET_KEYS_SELECTOR,
  type DesignParadigm,
} from '../presets';

/**
 * Localized labels for each design paradigm shown in the preset selector.
 * Resolved in-component via `useIntl()`; the public English `paradigmLabels`
 * export in `../presets` is kept unchanged for external consumers.
 */
const PARADIGM_LABEL_MESSAGES: Record<DesignParadigm, MessageDescriptor> = {
  flat: { id: 'ThemeManager.paradigmFlat' },
  skeuomorphism: { id: 'ThemeManager.paradigmSkeuomorphism' },
  material: { id: 'ThemeManager.paradigmMaterial' },
  neumorphism: { id: 'ThemeManager.paradigmNeumorphism' },
  glassmorphism: { id: 'ThemeManager.paradigmGlassmorphism' },
  brutalism: { id: 'ThemeManager.paradigmBrutalism' },
  claymorphism: { id: 'ThemeManager.paradigmClaymorphism' },
  minimalism: { id: 'ThemeManager.paradigmMinimalism' },
  'dark-moody': { id: 'ThemeManager.paradigmDarkMoody' },
};

const SELECT_STYLE: React.CSSProperties = {
  display: 'block',
  padding: '6px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  background: '#fff',
  cursor: 'pointer',
};

interface ThemePresetSelectorProps {
  onSelectPreset: (tokens: ThemeTokens) => void;
}

const ThemePresetSelector: React.FC<ThemePresetSelectorProps> = ({
  onSelectPreset,
}) => {
  const intl = useIntl();
  const [selectedKey, setSelectedKey] = useState<string>('');

  const handleApply = () => {
    if (selectedKey && selectedKey in themePresets) {
      onSelectPreset(themePresets[selectedKey as DesignParadigm]);
    }
  };

  return (
    <Stack direction="column" gap="200">
      <label
        htmlFor="theme-preset-select"
        style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}
      >
        {intl.formatMessage({ id: 'ThemeManager.presetLabel' })}
      </label>
      <Stack direction="row" gap="200" alignItems="center">
        <select
          id="theme-preset-select"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          style={SELECT_STYLE}
        >
          <option value="">
            {intl.formatMessage({ id: 'ThemeManager.presetPlaceholder' })}
          </option>
          {PRESET_KEYS_SELECTOR.map((key: DesignParadigm) => (
            <option key={key} value={key}>
              {intl.formatMessage(PARADIGM_LABEL_MESSAGES[key])}
            </option>
          ))}
        </select>
        <Button variant="solid" onPress={handleApply} isDisabled={!selectedKey}>
          {intl.formatMessage({ id: 'ThemeManager.presetApply' })}
        </Button>
      </Stack>
    </Stack>
  );
};

export default ThemePresetSelector;
