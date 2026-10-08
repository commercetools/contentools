
// ─────────────────────────────────────────────
// 1. FLAT DESIGN
//    Solid fills, no depth, no effects.
//    Influenced by Windows 8 Metro + iOS 7.

import type { ThemeTokens } from '@commercetools-demo/puck-types';

// ─────────────────────────────────────────────
export const flatTheme: ThemeTokens = {
  colorPrimary:              '#2563EB',
  colorPrimaryHover:         '#1D4ED8',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#64748B',
  colorSecondaryForeground:  '#FFFFFF',
  colorBackground:           '#F8FAFC',
  colorSurface:              '#FFFFFF',
  colorText:                 '#0F172A',
  colorTextMuted:            '#64748B',
  colorForeground:           '#0F172A',
  colorMuted:                '#F1F5F9',
  colorMutedForeground:      '#64748B',
  colorDestructive:          '#EF4444',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#0EA5E9',
  colorAccentForeground:     '#FFFFFF',
  colorBorder:               '#E2E8F0',
  colorInput:                '#FFFFFF',
  colorRing:                 '#2563EB',
  colorShadowLight:          '#FFFFFF',
  colorShadowDark:           '#CBD5E1',
  colorSurfaceGlass:         'rgba(255,255,255,0.9)',

  borderRadius:              'sm',
  borderWidth:               '1',
  borderStyle:               'solid',

  fontFamily:                'Inter, system-ui, sans-serif',
  fontHeading:               'Inter, system-ui, sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '700',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1,
  buttonStyle:               'solid',
  cardShadow:                'none',
  shadowStyle:               'none',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// 2. SKEUOMORPHISM
//    Mimics real-world materials and surfaces.
//    Warm parchment tones, textured backgrounds.
// ─────────────────────────────────────────────
export const skeuomorphismTheme: ThemeTokens = {
  colorPrimary:              '#B8860B',
  colorPrimaryHover:         '#9A7209',
  colorPrimaryForeground:    '#FFFBEA',
  colorSecondary:            '#8B6914',
  colorSecondaryForeground:  '#FFFBEA',
  colorBackground:           '#C8B97D',
  colorSurface:              '#EDE0B0',
  colorText:                 '#2C1A00',
  colorTextMuted:            '#6B4F1A',
  colorForeground:           '#2C1A00',
  colorMuted:                '#D9C98A',
  colorMutedForeground:      '#6B4F1A',
  colorDestructive:          '#C0392B',
  colorDestructiveForeground:'#FFF8F0',
  colorAccent:               '#D4A017',
  colorAccentForeground:     '#2C1A00',
  colorBorder:               '#8B6914',
  colorInput:                '#F5EBD0',
  colorRing:                 '#B8860B',
  colorShadowLight:          'rgba(255,255,255,0.5)',
  colorShadowDark:           'rgba(0,0,0,0.4)',
  colorSurfaceGlass:         'rgba(237,224,176,0.95)',

  borderRadius:              'sm',
  borderWidth:               '1',
  borderStyle:               'solid',

  fontFamily:                'Georgia, "Times New Roman", serif',
  fontHeading:               'Georgia, "Times New Roman", serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '700',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1,
  buttonStyle:               'solid',
  cardShadow:                'lg',
  shadowStyle:               'soft',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'noise',
  headerStyle:               'solid',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// 3. MATERIAL DESIGN
//    Layered surfaces, elevation via shadow,
//    deep purple + teal palette. Google's system.
// ─────────────────────────────────────────────
export const materialTheme: ThemeTokens = {
  colorPrimary:              '#6200EE',
  colorPrimaryHover:         '#3700B3',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#03DAC6',
  colorSecondaryForeground:  '#000000',
  colorBackground:           '#FAFAFA',
  colorSurface:              '#FFFFFF',
  colorText:                 '#000000',
  colorTextMuted:            '#757575',
  colorForeground:           '#000000',
  colorMuted:                '#F5F5F5',
  colorMutedForeground:      '#757575',
  colorDestructive:          '#B00020',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#03DAC6',
  colorAccentForeground:     '#000000',
  colorBorder:               '#E0E0E0',
  colorInput:                '#FFFFFF',
  colorRing:                 '#6200EE',
  colorShadowLight:          'rgba(255,255,255,0.1)',
  colorShadowDark:           'rgba(0,0,0,0.2)',
  colorSurfaceGlass:         'rgba(255,255,255,0.95)',

  borderRadius:              'sm',
  borderWidth:               '0',
  borderStyle:               'solid',

  fontFamily:                '"Roboto", system-ui, sans-serif',
  fontHeading:               '"Roboto", system-ui, sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '500',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1,
  buttonStyle:               'solid',
  cardShadow:                'md',
  shadowStyle:               'soft',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'material-ripple',
};

// ─────────────────────────────────────────────
// 4. NEUMORPHISM
//    Elements extruded from the background.
//    Matched bg color, dual inset/outset shadows.
// ─────────────────────────────────────────────
export const neumorphismTheme: ThemeTokens = {
  colorPrimary:              '#5B8DEF',
  colorPrimaryHover:         '#3D6ECC',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#8B8FA8',
  colorSecondaryForeground:  '#FFFFFF',
  colorBackground:           '#E0E5EC',
  colorSurface:              '#E0E5EC',
  colorText:                 '#31344B',
  colorTextMuted:            '#6B7280',
  colorForeground:           '#31344B',
  colorMuted:                '#E0E5EC',
  colorMutedForeground:      '#6B7280',
  colorDestructive:          '#E74C3C',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#5B8DEF',
  colorAccentForeground:     '#FFFFFF',
  colorBorder:               '#E0E5EC',
  colorInput:                '#E0E5EC',
  colorRing:                 '#5B8DEF',
  colorShadowLight:          '#FFFFFF',
  colorShadowDark:           '#A3B1C6',
  colorSurfaceGlass:         'rgba(224,229,236,0.95)',

  borderRadius:              'lg',
  borderWidth:               '0',
  borderStyle:               'solid',

  fontFamily:                '"Nunito", system-ui, sans-serif',
  fontHeading:               '"Nunito", system-ui, sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '700',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1.1,
  buttonStyle:               'solid',
  cardShadow:                'lg',
  shadowStyle:               'neumorphic',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// 5. GLASSMORPHISM
//    Frosted panels over colorful gradients.
//    backdrop-filter blur, semi-transparent surfaces.
// ─────────────────────────────────────────────
export const glassmorphismTheme: ThemeTokens = {
  colorPrimary:              '#818CF8',
  colorPrimaryHover:         '#6366F1',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#C084FC',
  colorSecondaryForeground:  '#FFFFFF',
  colorBackground:           '#4F46E5',
  colorSurface:              '#6366F1',
  colorText:                 '#FFFFFF',
  colorTextMuted:            'rgba(255,255,255,0.65)',
  colorForeground:           '#FFFFFF',
  colorMuted:                'rgba(255,255,255,0.1)',
  colorMutedForeground:      'rgba(255,255,255,0.55)',
  colorDestructive:          '#F87171',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#E879F9',
  colorAccentForeground:     '#FFFFFF',
  colorBorder:               'rgba(255,255,255,0.25)',
  colorInput:                'rgba(255,255,255,0.15)',
  colorRing:                 'rgba(255,255,255,0.5)',
  colorShadowLight:          'rgba(255,255,255,0.25)',
  colorShadowDark:           'rgba(0,0,0,0.15)',
  colorSurfaceGlass:         'rgba(255,255,255,0.15)',

  borderRadius:              'lg',
  borderWidth:               '1',
  borderStyle:               'solid',

  fontFamily:                '"Inter", system-ui, sans-serif',
  fontHeading:               '"Inter", system-ui, sans-serif',
  fontWeightBase:            '300',
  fontWeightHeading:         '500',
  letterSpacing:             'wide',
  textTransform:             'none',

  spacingScale:              1.1,
  buttonStyle:               'outline',
  cardShadow:                'sm',
  shadowStyle:               'soft',
  surfaceBlur:               'md',
  surfaceOpacity:            0.15,
  backgroundStyle:           'gradient',
  headerStyle:               'transparent',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// 6. BRUTALISM
//    Raw, intentionally rough. Thick borders,
//    hard offset shadows, heavy type, no radius.
// ─────────────────────────────────────────────
export const brutalismTheme: ThemeTokens = {
  colorPrimary:              '#FF3C00',
  colorPrimaryHover:         '#CC3000',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#FFEE00',
  colorSecondaryForeground:  '#000000',
  colorBackground:           '#FFFFFF',
  colorSurface:              '#FFFFFF',
  colorText:                 '#000000',
  colorTextMuted:            '#333333',
  colorForeground:           '#000000',
  colorMuted:                '#F5F5F5',
  colorMutedForeground:      '#333333',
  colorDestructive:          '#FF0000',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#FFEE00',
  colorAccentForeground:     '#000000',
  colorBorder:               '#000000',
  colorInput:                '#FFFFFF',
  colorRing:                 '#000000',
  colorShadowLight:          '#FFFFFF',
  colorShadowDark:           '#000000',
  colorSurfaceGlass:         'rgba(255,255,255,0.95)',

  borderRadius:              'none',
  borderWidth:               '2',
  borderStyle:               'solid',

  fontFamily:                '"Space Mono", "Courier New", monospace',
  fontHeading:               '"Space Grotesk", "Arial Black", sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '900',
  letterSpacing:             'tight',
  textTransform:             'uppercase',

  spacingScale:              1,
  buttonStyle:               'solid',
  cardShadow:                'md',
  shadowStyle:               'hard-offset',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'none',
};

// ─────────────────────────────────────────────
// 7. CLAYMORPHISM
//    Inflated 3D clay shapes, thick bottom
//    offset shadows, rounded full, pastel palette.
// ─────────────────────────────────────────────
export const claymorphismTheme: ThemeTokens = {
  colorPrimary:              '#A855F7',
  colorPrimaryHover:         '#9333EA',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#EC4899',
  colorSecondaryForeground:  '#FFFFFF',
  colorBackground:           '#F3E8FF',
  colorSurface:              '#FFFFFF',
  colorText:                 '#1E1033',
  colorTextMuted:            '#7C3AED',
  colorForeground:           '#1E1033',
  colorMuted:                '#FAF5FF',
  colorMutedForeground:      '#9061C2',
  colorDestructive:          '#F43F5E',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#F0ABFC',
  colorAccentForeground:     '#701A75',
  colorBorder:               '#E9D5FF',
  colorInput:                '#FAF5FF',
  colorRing:                 '#A855F7',
  colorShadowLight:          'rgba(255,255,255,0.8)',
  colorShadowDark:           '#7E22CE',
  colorSurfaceGlass:         'rgba(255,255,255,0.8)',

  borderRadius:              'lg',
  borderWidth:               '0',
  borderStyle:               'solid',

  fontFamily:                '"Nunito", "Poppins", system-ui, sans-serif',
  fontHeading:               '"Nunito", "Poppins", system-ui, sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '700',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1.15,
  buttonStyle:               'solid',
  cardShadow:                'lg',
  shadowStyle:               'clay',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'bouncy',
};

// ─────────────────────────────────────────────
// 8. MINIMALISM
//    Maximum whitespace, sparse type, near-zero
//    decoration. Luxury brands, editorial, portfolio.
// ─────────────────────────────────────────────
export const minimalismTheme: ThemeTokens = {
  colorPrimary:              '#111111',
  colorPrimaryHover:         '#333333',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#666666',
  colorSecondaryForeground:  '#FFFFFF',
  colorBackground:           '#FFFFFF',
  colorSurface:              '#FAFAFA',
  colorText:                 '#111111',
  colorTextMuted:            '#999999',
  colorForeground:           '#111111',
  colorMuted:                '#F5F5F5',
  colorMutedForeground:      '#999999',
  colorDestructive:          '#CC0000',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#111111',
  colorAccentForeground:     '#FFFFFF',
  colorBorder:               '#E5E5E5',
  colorInput:                '#FFFFFF',
  colorRing:                 '#111111',
  colorShadowLight:          '#FFFFFF',
  colorShadowDark:           '#E5E5E5',
  colorSurfaceGlass:         'rgba(255,255,255,0.95)',

  borderRadius:              'none',
  borderWidth:               '1',
  borderStyle:               'solid',

  fontFamily:                '"DM Sans", "Helvetica Neue", sans-serif',
  fontHeading:               '"DM Serif Display", Georgia, serif',
  fontWeightBase:            '300',
  fontWeightHeading:         '400',
  letterSpacing:             'wider',
  textTransform:             'none',

  spacingScale:              1.4,
  buttonStyle:               'outline',
  cardShadow:                'none',
  shadowStyle:               'none',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'minimal',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// 9. DARK / MOODY UI
//    Deep surfaces, indigo/violet accents,
//    glowing colored shadows. SaaS & dev tools.
// ─────────────────────────────────────────────
export const darkMoodyTheme: ThemeTokens = {
  colorPrimary:              '#818CF8',
  colorPrimaryHover:         '#6366F1',
  colorPrimaryForeground:    '#FFFFFF',
  colorSecondary:            '#334155',
  colorSecondaryForeground:  '#E2E8F0',
  colorBackground:           '#0F1117',
  colorSurface:              '#1A1D28',
  colorText:                 '#E2E8F0',
  colorTextMuted:            '#94A3B8',
  colorForeground:           '#E2E8F0',
  colorMuted:                '#1E2235',
  colorMutedForeground:      '#64748B',
  colorDestructive:          '#F87171',
  colorDestructiveForeground:'#FFFFFF',
  colorAccent:               '#818CF8',
  colorAccentForeground:     '#FFFFFF',
  colorBorder:               '#2D3148',
  colorInput:                '#1A1D28',
  colorRing:                 '#6366F1',
  colorShadowLight:          'rgba(129,140,248,0.25)',
  colorShadowDark:           'rgba(0,0,0,0.5)',
  colorSurfaceGlass:         'rgba(26,29,40,0.85)',

  borderRadius:              'md',
  borderWidth:               '1',
  borderStyle:               'solid',

  fontFamily:                '"Inter", system-ui, sans-serif',
  fontHeading:               '"Inter", system-ui, sans-serif',
  fontWeightBase:            '400',
  fontWeightHeading:         '500',
  letterSpacing:             'normal',
  textTransform:             'none',

  spacingScale:              1,
  buttonStyle:               'solid',
  cardShadow:                'sm',
  shadowStyle:               'glow',
  surfaceBlur:               'none',
  surfaceOpacity:            1,
  backgroundStyle:           'solid',
  headerStyle:               'solid',
  animationStyle:            'subtle',
};

// ─────────────────────────────────────────────
// PRESETS MAP
// ─────────────────────────────────────────────
export type DesignParadigm =
  | 'flat'
  | 'skeuomorphism'
  | 'material'
  | 'neumorphism'
  | 'glassmorphism'
  | 'brutalism'
  | 'claymorphism'
  | 'minimalism'
  | 'dark-moody';

export const themePresets: Record<DesignParadigm, ThemeTokens> = {
  flat:            flatTheme,
  skeuomorphism:   skeuomorphismTheme,
  material:        materialTheme,
  neumorphism:     neumorphismTheme,
  glassmorphism:   glassmorphismTheme,
  brutalism:       brutalismTheme,
  claymorphism:    claymorphismTheme,
  minimalism:      minimalismTheme,
  'dark-moody':    darkMoodyTheme,
};

export const paradigmLabels: Record<DesignParadigm, string> = {
  flat:            'Flat design',
  skeuomorphism:   'Skeuomorphism',
  material:        'Material design',
  neumorphism:     'Neumorphism',
  glassmorphism:   'Glassmorphism',
  brutalism:       'Brutalism',
  claymorphism:    'Claymorphism',
  minimalism:      'Minimalism',
  'dark-moody':    'Dark / moody',
};

export const PRESET_KEYS_SELECTOR: DesignParadigm[] = [
  'flat',
  'material',
  'neumorphism',
  'glassmorphism',
  'brutalism',
  'dark-moody',
];

// ─────────────────────────────────────────────
// CSS VAR RESOLVER
// ─────────────────────────────────────────────
type ShadowStyle   = NonNullable<ThemeTokens['shadowStyle']>;
type SurfaceBlur   = NonNullable<ThemeTokens['surfaceBlur']>;
type LetterSpacing = NonNullable<ThemeTokens['letterSpacing']>;
type BorderRadius  = NonNullable<ThemeTokens['borderRadius']>;

const shadowMap: Record<ShadowStyle, string> = {
  none:          'none',
  soft:          '0 2px 8px 0 var(--color-shadow-dark)',
  'hard-offset': '4px 4px 0px 0px var(--color-shadow-dark)',
  neumorphic:    '6px 6px 14px var(--color-shadow-dark), -6px -6px 14px var(--color-shadow-light)',
  clay:          '0 8px 0 var(--color-shadow-dark), 0 12px 28px var(--color-shadow-dark)',
  glow:          '0 0 24px var(--color-shadow-light)',
};

const blurMap: Record<SurfaceBlur, string> = {
  none: '0px',
  sm:   '4px',
  md:   '12px',
  lg:   '24px',
};

const letterSpacingMap: Record<LetterSpacing, string> = {
  tight:  '-0.025em',
  normal: '0em',
  wide:   '0.05em',
  wider:  '0.15em',
};

const borderRadiusMap: Record<BorderRadius, string> = {
  none: '0px',
  sm:   '4px',
  md:   '8px',
  lg:   '16px',
  full: '9999px',
};

export function buildCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    '--color-primary':              tokens.colorPrimary,
    '--color-primary-hover':        tokens.colorPrimaryHover,
    '--color-primary-foreground':   tokens.colorPrimaryForeground  ?? '#ffffff',
    '--color-secondary':            tokens.colorSecondary,
    '--color-secondary-foreground': tokens.colorSecondaryForeground ?? '#ffffff',
    '--color-background':           tokens.colorBackground,
    '--color-surface':              tokens.colorSurface,
    '--color-text':                 tokens.colorText,
    '--color-text-muted':           tokens.colorTextMuted,
    '--color-foreground':           tokens.colorForeground          ?? tokens.colorText,
    '--color-muted':                tokens.colorMuted               ?? tokens.colorSurface,
    '--color-muted-foreground':     tokens.colorMutedForeground     ?? tokens.colorTextMuted,
    '--color-destructive':          tokens.colorDestructive         ?? '#ef4444',
    '--color-destructive-foreground':tokens.colorDestructiveForeground ?? '#ffffff',
    '--color-accent':               tokens.colorAccent              ?? tokens.colorPrimary,
    '--color-accent-foreground':    tokens.colorAccentForeground    ?? '#ffffff',
    '--color-border':               tokens.colorBorder              ?? '#e2e8f0',
    '--color-input':                tokens.colorInput               ?? tokens.colorSurface,
    '--color-ring':                 tokens.colorRing                ?? tokens.colorPrimary,
    '--color-shadow-light':         tokens.colorShadowLight         ?? '#ffffff',
    '--color-shadow-dark':          tokens.colorShadowDark          ?? '#b8bec7',
    '--color-surface-glass':        tokens.colorSurfaceGlass        ?? 'rgba(255,255,255,0.15)',
    '--shadow-card':                shadowMap[tokens.shadowStyle ?? 'none'],
    '--surface-blur':               blurMap[tokens.surfaceBlur ?? 'none'],
    '--surface-opacity':            String(tokens.surfaceOpacity),
    '--letter-spacing':             letterSpacingMap[tokens.letterSpacing ?? 'normal'],
    '--border-radius':              borderRadiusMap[tokens.borderRadius],
    '--border-width':               `${tokens.borderWidth}px`,
    '--border-style':               tokens.borderStyle ?? '',
    '--font-family':                tokens.fontFamily,
    '--font-heading':               tokens.fontHeading,
    '--font-weight-base':           tokens.fontWeightBase ?? '300',
    '--font-weight-heading':        tokens.fontWeightHeading ?? '700',
    '--text-transform':             tokens.textTransform ?? 'none',
    '--spacing-scale':              String(tokens.spacingScale),
  };
}
