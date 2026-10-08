export interface ThemeTokens {
  colorPrimary: string;
  colorPrimaryHover: string;
  colorPrimaryForeground?: string;
  colorSecondary: string;
  colorSecondaryForeground?: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;
  colorForeground?: string;
  colorMuted?: string;
  colorMutedForeground?: string;
  colorDestructive?: string;
  colorDestructiveForeground?: string;
  colorAccent?: string;
  colorAccentForeground?: string;
  colorBorder?: string;
  colorInput?: string;
  colorRing?: string;
  colorShadowLight?: string;
  colorShadowDark?: string;
  colorSurfaceGlass?: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  borderWidth: '0' | '1' | '2';
  borderStyle?: 'solid' | 'dashed' | 'double';
  fontFamily: string;
  fontHeading: string;
  fontWeightBase?: '300' | '400' | '500';
  fontWeightHeading?: '400' | '500' | '700' | '900';
  letterSpacing?: 'tight' | 'normal' | 'wide' | 'wider';
  textTransform?: 'none' | 'uppercase';
  spacingScale: number;
  buttonStyle: 'solid' | 'outline' | 'ghost';
  cardShadow: 'none' | 'sm' | 'md' | 'lg';
  headerStyle: 'transparent' | 'solid' | 'minimal';
  shadowStyle?: 'none' | 'soft' | 'hard-offset' | 'neumorphic' | 'clay' | 'glow';
  surfaceBlur?: 'none' | 'sm' | 'md' | 'lg';
  surfaceOpacity?: number;
  backgroundStyle?: 'solid' | 'gradient' | 'noise';
  animationStyle?: string;
}

export interface ImportResult {
  imported: string[];
  failed: Array<{ key: string; error: string }>;
}
