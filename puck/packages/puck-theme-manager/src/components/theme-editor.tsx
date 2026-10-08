import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { PuckApiProvider, usePuckConfiguration } from '@commercetools-demo/puck-api';
import type { ThemeTokens } from '@commercetools-demo/puck-types';
import {
  Button,
  Card as NimbusCard,
  Grid as NimbusGrid,
  LoadingSpinner,
  NumberInput as NimbusNumberInput,
  Stack,
  Text as NimbusText,
  TextInput as NimbusTextInput,
} from '@commercetools/nimbus';
import { DEFAULT_THEME } from '../constants';
import { EnsureNimbusProvider } from '../EnsureNimbusProvider';
import { EnsureIntlProvider } from '../EnsureIntlProvider';
import ThemePresetSelector from './theme-preset-selector';
import { ColorField } from './color-field';

// ---------------------------------------------------------------------------
// Thin Nimbus adapters
//
// This is a large, highly repetitive settings form. To keep the markup below
// readable and avoid a risky line-by-line rewrite, these adapters preserve the
// original component call-sites while rendering Nimbus components underneath.
// ---------------------------------------------------------------------------

const SCALE_TO_GAP: Record<string, string> = {
  xs: '100',
  s: '200',
  m: '400',
  l: '600',
  xl: '800',
};

interface SpacingsLayoutProps {
  scale?: string;
  alignItems?: string;
  justifyContent?: string;
  children?: React.ReactNode;
}

const Spacings = {
  Stack: ({ scale = 'm', alignItems, justifyContent, children }: SpacingsLayoutProps) => (
    <Stack
      direction="column"
      gap={SCALE_TO_GAP[scale] ?? '400'}
      alignItems={alignItems}
      justifyContent={justifyContent}
    >
      {children}
    </Stack>
  ),
  Inline: ({ scale = 'm', alignItems, justifyContent, children }: SpacingsLayoutProps) => (
    <Stack
      direction="row"
      gap={SCALE_TO_GAP[scale] ?? '400'}
      alignItems={alignItems}
      justifyContent={justifyContent}
    >
      {children}
    </Stack>
  ),
};

const TONE_TO_COLOR: Record<string, string | undefined> = {
  secondary: 'neutral.11',
  critical: 'critical.11',
  positive: 'positive.11',
};

const Text = {
  Headline: ({ as = 'h2', children }: { as?: React.ElementType; children?: React.ReactNode }) => (
    <NimbusText as={as} fontSize={as === 'h1' ? '2xl' : 'xl'} fontWeight="700">
      {children}
    </NimbusText>
  ),
  Body: ({ tone, children }: { tone?: string; children?: React.ReactNode }) => (
    <NimbusText color={tone ? TONE_TO_COLOR[tone] : undefined}>{children}</NimbusText>
  ),
};

const Card = ({ children }: { children?: React.ReactNode }) => (
  <NimbusCard.Root variant="outlined">
    <NimbusCard.Body>{children}</NimbusCard.Body>
  </NimbusCard.Root>
);

const Grid = Object.assign(
  ({
    gridGap,
    gridTemplateColumns,
    gridAutoColumns,
    children,
  }: {
    gridGap?: string;
    gridTemplateColumns?: string;
    gridAutoColumns?: string;
    children?: React.ReactNode;
  }) => (
    <NimbusGrid gap={gridGap} templateColumns={gridTemplateColumns} autoColumns={gridAutoColumns}>
      {children}
    </NimbusGrid>
  ),
  {
    Item: ({ children }: { children?: React.ReactNode }) => (
      <NimbusGrid.Item>{children}</NimbusGrid.Item>
    ),
  }
);

interface AdapterButtonProps {
  label?: React.ReactNode;
  onClick?: () => void;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}
const PrimaryButton = ({ label, onClick, isDisabled }: AdapterButtonProps) => (
  <Button variant="solid" onPress={onClick} isDisabled={isDisabled}>{label}</Button>
);
const SecondaryButton = ({ label, onClick, isDisabled }: AdapterButtonProps) => (
  <Button variant="outline" onPress={onClick} isDisabled={isDisabled}>{label}</Button>
);
const FlatButton = ({ label, onClick, isDisabled, icon }: AdapterButtonProps) => (
  <Button variant="ghost" onPress={onClick} isDisabled={isDisabled}>{icon}{label}</Button>
);

const FieldLabel = ({ title, htmlFor }: { title: string; htmlFor?: string }) => (
  <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
    {title}
  </label>
);

interface AdapterInputProps {
  id?: string;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  horizontalConstraint?: number;
}
const TextInput = ({ id, value, onChange }: AdapterInputProps) => (
  <NimbusTextInput
    id={id}
    value={value == null ? '' : String(value)}
    onChange={(v) => onChange?.({ target: { value: v } })}
  />
);
const NumberInput = ({ id, value, onChange }: AdapterInputProps) => (
  <NimbusNumberInput
    id={id}
    value={value == null || value === '' ? 0 : Number(value)}
    onChange={(n) => onChange?.({ target: { value: Number.isNaN(n) ? '' : String(n) } })}
  />
);

// Select option lists. `label` holds a MessageDescriptor resolved at the
// `<option>` render site via `intl.formatMessage`; numeric-only labels (border
// width, font weight) are code-like values kept as plain strings.
interface SelectOption {
  value: string;
  label: MessageDescriptor | string;
}

const BORDER_RADIUS_OPTIONS: SelectOption[] = [
  { value: 'none', label: { id: 'ThemeManager.optionNone' } },
  { value: 'sm', label: { id: 'ThemeManager.optionSmall' } },
  { value: 'md', label: { id: 'ThemeManager.optionMedium' } },
  { value: 'lg', label: { id: 'ThemeManager.optionLarge' } },
  { value: 'full', label: { id: 'ThemeManager.optionFull' } },
];

const BORDER_WIDTH_OPTIONS: SelectOption[] = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
];

const BUTTON_STYLE_OPTIONS: SelectOption[] = [
  { value: 'solid', label: { id: 'ThemeManager.optionSolid' } },
  { value: 'outline', label: { id: 'ThemeManager.optionOutline' } },
  { value: 'ghost', label: { id: 'ThemeManager.optionGhost' } },
];

const CARD_SHADOW_OPTIONS: SelectOption[] = [
  { value: 'none', label: { id: 'ThemeManager.optionNone' } },
  { value: 'sm', label: { id: 'ThemeManager.optionSmall' } },
  { value: 'md', label: { id: 'ThemeManager.optionMedium' } },
  { value: 'lg', label: { id: 'ThemeManager.optionLarge' } },
];

const HEADER_STYLE_OPTIONS: SelectOption[] = [
  { value: 'transparent', label: { id: 'ThemeManager.optionTransparent' } },
  { value: 'solid', label: { id: 'ThemeManager.optionSolid' } },
  { value: 'minimal', label: { id: 'ThemeManager.optionMinimal' } },
];

const SHADOW_STYLE_OPTIONS: SelectOption[] = [
  { value: 'none', label: { id: 'ThemeManager.optionNone' } },
  { value: 'soft', label: { id: 'ThemeManager.optionSoft' } },
  { value: 'hard-offset', label: { id: 'ThemeManager.optionHardOffset' } },
  { value: 'neumorphic', label: { id: 'ThemeManager.optionNeumorphic' } },
  { value: 'clay', label: { id: 'ThemeManager.optionClay' } },
  { value: 'glow', label: { id: 'ThemeManager.optionGlow' } },
];

const SURFACE_BLUR_OPTIONS: SelectOption[] = [
  { value: 'none', label: { id: 'ThemeManager.optionNone' } },
  { value: 'sm', label: { id: 'ThemeManager.optionSmall' } },
  { value: 'md', label: { id: 'ThemeManager.optionMedium' } },
  { value: 'lg', label: { id: 'ThemeManager.optionLarge' } },
];

const FONT_WEIGHT_BASE_OPTIONS: SelectOption[] = [
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
];

const FONT_WEIGHT_HEADING_OPTIONS: SelectOption[] = [
  { value: '400', label: '400' },
  { value: '500', label: '500' },
  { value: '700', label: '700' },
  { value: '900', label: '900' },
];

const LETTER_SPACING_OPTIONS: SelectOption[] = [
  { value: 'tight', label: { id: 'ThemeManager.optionTight' } },
  { value: 'normal', label: { id: 'ThemeManager.optionNormal' } },
  { value: 'wide', label: { id: 'ThemeManager.optionWide' } },
  { value: 'wider', label: { id: 'ThemeManager.optionWider' } },
];

const TEXT_TRANSFORM_OPTIONS: SelectOption[] = [
  { value: 'none', label: { id: 'ThemeManager.optionNone' } },
  { value: 'uppercase', label: { id: 'ThemeManager.optionUppercase' } },
];

const BORDER_STYLE_OPTIONS: SelectOption[] = [
  { value: 'solid', label: { id: 'ThemeManager.optionSolid' } },
  { value: 'dashed', label: { id: 'ThemeManager.optionDashed' } },
  { value: 'double', label: { id: 'ThemeManager.optionDouble' } },
];

const BACKGROUND_STYLE_OPTIONS: SelectOption[] = [
  { value: 'solid', label: { id: 'ThemeManager.optionSolid' } },
  { value: 'gradient', label: { id: 'ThemeManager.optionGradient' } },
  { value: 'noise', label: { id: 'ThemeManager.optionNoise' } },
];

const SELECT_STYLE: React.CSSProperties = {
  display: 'block',
  padding: '6px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  background: '#fff',
  cursor: 'pointer',
};

interface InnerProps {
  backButton?: {
    label: string;
    onClick: () => void;
    icon: React.ReactElement;
  };
}

export interface ThemeManagerProps extends InnerProps {
  baseURL: string;
  projectKey: string;
  businessUnitKey: string;
  jwtToken: string;
  /** Content locale (e.g. "en-US"). Resolves to en/es; unsupported → en. */
  locale?: string;
  /** Per-key overrides for UI strings, applied on top of the resolved catalog. */
  messageOverrides?: Record<string, string>;
}

const ThemeEditorInner: React.FC<InnerProps> = ({ backButton }) => {
  const history = useHistory();
  const intl = useIntl();
  const {
    theme,
    loading,
    error,
    fetchTheme,
    saveTheme,
    updateTheme,
    clearError,
  } = usePuckConfiguration();

  // Resolve a select option's label: MessageDescriptor → translated, string → as-is.
  const formatOption = (label: MessageDescriptor | string): string =>
    typeof label === 'string' ? label : intl.formatMessage(label);

  const [formValues, setFormValues] = useState<ThemeTokens>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  const applyThemeToForm = useCallback((t: ThemeTokens | null | undefined) => {
    if (t == null || typeof t !== 'object') {
      setFormValues(DEFAULT_THEME);
      return;
    }
    setFormValues({
      ...DEFAULT_THEME,
      ...t,
      colorPrimary: t.colorPrimary ?? DEFAULT_THEME.colorPrimary,
      colorPrimaryHover: t.colorPrimaryHover ?? DEFAULT_THEME.colorPrimaryHover,
      colorSecondary: t.colorSecondary ?? DEFAULT_THEME.colorSecondary,
      colorBackground: t.colorBackground ?? DEFAULT_THEME.colorBackground,
      colorSurface: t.colorSurface ?? DEFAULT_THEME.colorSurface,
      colorText: t.colorText ?? DEFAULT_THEME.colorText,
      colorTextMuted: t.colorTextMuted ?? DEFAULT_THEME.colorTextMuted,
      borderRadius: t.borderRadius ?? DEFAULT_THEME.borderRadius,
      borderWidth: t.borderWidth ?? DEFAULT_THEME.borderWidth,
      fontFamily: t.fontFamily ?? DEFAULT_THEME.fontFamily,
      fontHeading: t.fontHeading ?? DEFAULT_THEME.fontHeading,
      spacingScale:
        typeof t.spacingScale === 'number'
          ? t.spacingScale
          : DEFAULT_THEME.spacingScale,
      buttonStyle: t.buttonStyle ?? DEFAULT_THEME.buttonStyle,
      cardShadow: t.cardShadow ?? DEFAULT_THEME.cardShadow,
      headerStyle: t.headerStyle ?? DEFAULT_THEME.headerStyle,
      colorPrimaryForeground: t.colorPrimaryForeground ?? undefined,
      colorSecondaryForeground: t.colorSecondaryForeground ?? undefined,
      colorForeground: t.colorForeground ?? undefined,
      colorMuted: t.colorMuted ?? undefined,
      colorMutedForeground: t.colorMutedForeground ?? undefined,
      colorDestructive: t.colorDestructive ?? undefined,
      colorDestructiveForeground: t.colorDestructiveForeground ?? undefined,
      colorAccent: t.colorAccent ?? undefined,
      colorAccentForeground: t.colorAccentForeground ?? undefined,
      colorBorder: t.colorBorder ?? undefined,
      colorInput: t.colorInput ?? undefined,
      colorRing: t.colorRing ?? undefined,
      colorShadowLight: t.colorShadowLight ?? DEFAULT_THEME.colorShadowLight,
      colorShadowDark: t.colorShadowDark ?? DEFAULT_THEME.colorShadowDark,
      colorSurfaceGlass: t.colorSurfaceGlass ?? DEFAULT_THEME.colorSurfaceGlass,
      shadowStyle: t.shadowStyle ?? DEFAULT_THEME.shadowStyle,
      surfaceBlur: t.surfaceBlur ?? DEFAULT_THEME.surfaceBlur,
      surfaceOpacity:
        typeof t.surfaceOpacity === 'number'
          ? t.surfaceOpacity
          : DEFAULT_THEME.surfaceOpacity,
      fontWeightBase: t.fontWeightBase ?? DEFAULT_THEME.fontWeightBase,
      fontWeightHeading: t.fontWeightHeading ?? DEFAULT_THEME.fontWeightHeading,
      letterSpacing: t.letterSpacing ?? DEFAULT_THEME.letterSpacing,
      textTransform: t.textTransform ?? DEFAULT_THEME.textTransform,
      borderStyle: t.borderStyle ?? DEFAULT_THEME.borderStyle,
      backgroundStyle: t.backgroundStyle ?? DEFAULT_THEME.backgroundStyle,
    });
  }, []);

  useEffect(() => {
    void fetchTheme();
  }, [fetchTheme]);

  useEffect(() => {
    applyThemeToForm(theme);
  }, [theme, applyThemeToForm]);

  const handleChange = useCallback(
    <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => {
      setFormValues((prev) => ({ ...prev, [key]: value }));
      setSaveSuccess(false);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    clearError();
    try {
      await saveTheme(formValues);
      setSaveSuccess(true);
    } finally {
      setSaving(false);
    }
  }, [formValues, saveTheme, clearError]);

  const handleResetToDefault = useCallback(async () => {
    setFormValues(DEFAULT_THEME);
    setSaveSuccess(false);
    if (theme != null) {
      setSaving(true);
      clearError();
      try {
        await updateTheme(DEFAULT_THEME);
        setSaveSuccess(true);
      } finally {
        setSaving(false);
      }
    }
  }, [theme, updateTheme, clearError]);

  if (loading && theme == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Spacings.Stack scale="l">
      {backButton && (
        <FlatButton
          onClick={() => history.push('/')}
          label={backButton.label}
          icon={backButton.icon as any}
        >
          {backButton.label}
        </FlatButton>
      )}
      <div style={{ padding: '0 20px' }}>
        <Spacings.Stack scale="l" alignItems="flex-start">
          <Text.Headline as="h1">
            {intl.formatMessage({ id: 'ThemeManager.themeTitle' })}
          </Text.Headline>
          <Text.Body tone="secondary">
            {intl.formatMessage({ id: 'ThemeManager.themeIntro' })}
          </Text.Body>
        </Spacings.Stack>
      </div>
      {error && (
        <Card>
          <Spacings.Stack scale="m">
            <Text.Headline as="h2">
              {intl.formatMessage({ id: 'ThemeManager.errorHeading' })}
            </Text.Headline>
            <Text.Body tone="critical">{error}</Text.Body>
          </Spacings.Stack>
        </Card>
      )}

      {saveSuccess && (
        <Text.Body tone="positive">
          {intl.formatMessage({ id: 'ThemeManager.saveSuccess' })}
        </Text.Body>
      )}

      <Spacings.Stack scale="l">
        <div style={{ padding: '0 20px' }}>
          <Spacings.Inline scale="s">
            <ThemePresetSelector onSelectPreset={applyThemeToForm} />
          </Spacings.Inline>
        </div>
        <Spacings.Stack scale="s">
          <div style={{ padding: '0 20px' }}>
            <button
              type="button"
              onClick={() => setIsConfigExpanded((prev) => !prev)}
              aria-expanded={isConfigExpanded}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                margin: 0,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                background: 'transparent',
              }}
            >
              <Text.Headline as="h2">
                {intl.formatMessage({ id: 'ThemeManager.themeConfiguration' })}
              </Text.Headline>
              <span
                style={{
                  display: 'inline-block',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid currentColor',
                  transform: isConfigExpanded ? 'rotate(180deg)' : 'none',
                  opacity: 0.7,
                }}
              />
            </button>
          </div>
          {isConfigExpanded && (
            <div style={{ padding: '0 20px' }}>
              <Spacings.Stack scale="l">
                <Spacings.Stack scale="xl">
                  <Text.Headline as="h2">
                    {intl.formatMessage({ id: 'ThemeManager.sectionColors' })}
                  </Text.Headline>
                  <Grid
                    gridGap="16px"
                    gridAutoColumns="1fr"
                    gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                  >
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldPrimary' })}
                        value={formValues.colorPrimary}
                        onChange={(v) => handleChange('colorPrimary', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldPrimaryHover' })}
                        value={formValues.colorPrimaryHover}
                        onChange={(v) => handleChange('colorPrimaryHover', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldSecondary' })}
                        value={formValues.colorSecondary}
                        onChange={(v) => handleChange('colorSecondary', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldBackground' })}
                        value={formValues.colorBackground}
                        onChange={(v) => handleChange('colorBackground', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldSurface' })}
                        value={formValues.colorSurface}
                        onChange={(v) => handleChange('colorSurface', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldText' })}
                        value={formValues.colorText}
                        onChange={(v) => handleChange('colorText', v)}
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldTextMuted' })}
                        value={formValues.colorTextMuted}
                        onChange={(v) => handleChange('colorTextMuted', v)}
                      />
                    </Grid.Item>
                  </Grid>

                  <Text.Headline as="h2">
                    {intl.formatMessage({ id: 'ThemeManager.sectionExtendedColors' })}
                  </Text.Headline>
                  <Text.Body tone="secondary">
                    {intl.formatMessage({ id: 'ThemeManager.sectionExtendedColorsIntro' })}
                  </Text.Body>
                  <Grid
                    gridGap="16px"
                    gridAutoColumns="1fr"
                    gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                  >
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldPrimaryForeground' })}
                        value={formValues.colorPrimaryForeground}
                        onChange={(v) => handleChange('colorPrimaryForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldSecondaryForeground' })}
                        value={formValues.colorSecondaryForeground}
                        onChange={(v) => handleChange('colorSecondaryForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldForeground' })}
                        value={formValues.colorForeground}
                        onChange={(v) => handleChange('colorForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldMuted' })}
                        value={formValues.colorMuted}
                        onChange={(v) => handleChange('colorMuted', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldMutedForeground' })}
                        value={formValues.colorMutedForeground}
                        onChange={(v) => handleChange('colorMutedForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldDestructive' })}
                        value={formValues.colorDestructive}
                        onChange={(v) => handleChange('colorDestructive', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldDestructiveForeground' })}
                        value={formValues.colorDestructiveForeground}
                        onChange={(v) => handleChange('colorDestructiveForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldAccent' })}
                        value={formValues.colorAccent}
                        onChange={(v) => handleChange('colorAccent', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldAccentForeground' })}
                        value={formValues.colorAccentForeground}
                        onChange={(v) => handleChange('colorAccentForeground', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldBorder' })}
                        value={formValues.colorBorder}
                        onChange={(v) => handleChange('colorBorder', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldInput' })}
                        value={formValues.colorInput}
                        onChange={(v) => handleChange('colorInput', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldRing' })}
                        value={formValues.colorRing}
                        onChange={(v) => handleChange('colorRing', v)}
                        fallback="#000000"
                      />
                    </Grid.Item>
                  </Grid>

                  <Text.Headline as="h2">
                    {intl.formatMessage({ id: 'ThemeManager.sectionTypography' })}
                  </Text.Headline>
                  <Grid
                    gridGap="16px"
                    gridAutoColumns="1fr"
                    gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                  >
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldFontFamily' })}
                        value={formValues.fontFamily}
                        onChange={(v) => handleChange('fontFamily', v)}
                        fallback="#ffffff"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <ColorField
                        label={intl.formatMessage({ id: 'ThemeManager.fieldShadowDark' })}
                        value={formValues.colorShadowDark}
                        onChange={(v) => handleChange('colorShadowDark', v)}
                        fallback="#b8bec7"
                      />
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldSurfaceGlass' })} htmlFor="colorSurfaceGlass" />
                        <TextInput
                          horizontalConstraint={3}
                          id="colorSurfaceGlass"
                          value={formValues.colorSurfaceGlass ?? ''}
                          onChange={(e) =>
                            handleChange(
                              'colorSurfaceGlass',
                              (e.target as HTMLInputElement).value
                            )
                          }
                        />
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldShadowStyle' })} htmlFor="shadowStyle" />
                        <select
                          id="shadowStyle"
                          value={formValues.shadowStyle ?? DEFAULT_THEME.shadowStyle}
                          onChange={(e) =>
                            handleChange(
                              'shadowStyle',
                              e.target.value as ThemeTokens['shadowStyle']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {SHADOW_STYLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldSurfaceBlur' })} htmlFor="surfaceBlur" />
                        <select
                          id="surfaceBlur"
                          value={formValues.surfaceBlur ?? DEFAULT_THEME.surfaceBlur}
                          onChange={(e) =>
                            handleChange(
                              'surfaceBlur',
                              e.target.value as ThemeTokens['surfaceBlur']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {SURFACE_BLUR_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldSurfaceOpacity' })} htmlFor="surfaceOpacity" />
                        <NumberInput
                          id="surfaceOpacity"
                          horizontalConstraint={3}
                          value={formValues.surfaceOpacity ?? 1}
                          onChange={(e) =>
                            handleChange(
                              'surfaceOpacity',
                              e.target.value === ''
                                ? 0
                                : Math.min(1, Math.max(0, Number(e.target.value)))
                            )
                          }
                        />
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldBorderStyle' })} htmlFor="borderStyle" />
                        <select
                          id="borderStyle"
                          value={formValues.borderStyle ?? DEFAULT_THEME.borderStyle}
                          onChange={(e) =>
                            handleChange(
                              'borderStyle',
                              e.target.value as ThemeTokens['borderStyle']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {BORDER_STYLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldBackgroundStyle' })} htmlFor="backgroundStyle" />
                        <select
                          id="backgroundStyle"
                          value={formValues.backgroundStyle ?? DEFAULT_THEME.backgroundStyle}
                          onChange={(e) =>
                            handleChange(
                              'backgroundStyle',
                              e.target.value as ThemeTokens['backgroundStyle']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {BACKGROUND_STYLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                  </Grid>

                  <Text.Headline as="h2">
                    {intl.formatMessage({ id: 'ThemeManager.sectionTypographyWeightTransform' })}
                  </Text.Headline>
                  <Grid
                    gridGap="16px"
                    gridAutoColumns="1fr"
                    gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                  >
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldFontWeightBase' })} htmlFor="fontWeightBase" />
                        <select
                          id="fontWeightBase"
                          value={formValues.fontWeightBase ?? DEFAULT_THEME.fontWeightBase}
                          onChange={(e) =>
                            handleChange(
                              'fontWeightBase',
                              e.target.value as ThemeTokens['fontWeightBase']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {FONT_WEIGHT_BASE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldFontWeightHeading' })} htmlFor="fontWeightHeading" />
                        <select
                          id="fontWeightHeading"
                          value={formValues.fontWeightHeading ?? DEFAULT_THEME.fontWeightHeading}
                          onChange={(e) =>
                            handleChange(
                              'fontWeightHeading',
                              e.target.value as ThemeTokens['fontWeightHeading']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {FONT_WEIGHT_HEADING_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldLetterSpacing' })} htmlFor="letterSpacing" />
                        <select
                          id="letterSpacing"
                          value={formValues.letterSpacing ?? DEFAULT_THEME.letterSpacing}
                          onChange={(e) =>
                            handleChange(
                              'letterSpacing',
                              e.target.value as ThemeTokens['letterSpacing']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {LETTER_SPACING_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                    <Grid.Item>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <FieldLabel title={intl.formatMessage({ id: 'ThemeManager.fieldTextTransform' })} htmlFor="textTransform" />
                        <select
                          id="textTransform"
                          value={formValues.textTransform ?? DEFAULT_THEME.textTransform}
                          onChange={(e) =>
                            handleChange(
                              'textTransform',
                              e.target.value as ThemeTokens['textTransform']
                            )
                          }
                          style={SELECT_STYLE}
                        >
                          {TEXT_TRANSFORM_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{formatOption(o.label)}</option>
                          ))}
                        </select>
                      </div>
                    </Grid.Item>
                  </Grid>

                  <Spacings.Inline>
                    <PrimaryButton
                      label={
                        saving
                          ? intl.formatMessage({ id: 'ThemeManager.saving' })
                          : intl.formatMessage({ id: 'ThemeManager.save' })
                      }
                      onClick={handleSave}
                      isDisabled={saving}
                    />
                    <SecondaryButton
                      label={intl.formatMessage({ id: 'ThemeManager.resetToDefault' })}
                      onClick={handleResetToDefault}
                      isDisabled={saving}
                    />
                  </Spacings.Inline>
                </Spacings.Stack>
              </Spacings.Stack>
            </div>
          )}
        </Spacings.Stack>
      </Spacings.Stack>
    </Spacings.Stack>
  );
};

const ThemeManager: React.FC<ThemeManagerProps> = ({
  baseURL,
  projectKey,
  businessUnitKey,
  jwtToken,
  locale,
  messageOverrides,
  ...innerProps
}) => (
  <PuckApiProvider
    baseURL={baseURL}
    projectKey={projectKey}
    businessUnitKey={businessUnitKey}
    jwtToken={jwtToken}
  >
    <EnsureNimbusProvider locale={locale}>
      <EnsureIntlProvider locale={locale} messageOverrides={messageOverrides}>
        <ThemeEditorInner {...innerProps} />
      </EnsureIntlProvider>
    </EnsureNimbusProvider>
  </PuckApiProvider>
);

export default ThemeManager;
