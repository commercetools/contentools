import type { Field } from '@measured/puck';
import { createPresetSelectField, type PresetOption } from './PresetSelectField';

// ---------------------------------------------------------------------------
// Friendly size vocabularies
//
// Plain-language dropdowns for the CSS-dimension props (width, height, spacing,
// corner rounding, …) so non-technical editors never type a CSS value. Each
// option's `value` is the raw string the corresponding render function already
// expects, so these controls are drop-in replacements for the old free-text
// fields and never change stored-data semantics:
//
//   • CSS lengths / percentages used directly  -> '48px', '100%', ''
//   • unitless numbers the renderer parseInt()s -> '24', '180'   (Divider, WebsiteLogo)
//
// The current default of every field maps onto one of these presets; any other
// pre-existing value is preserved by PresetSelectField as a "Custom (…)" entry.
// ---------------------------------------------------------------------------

// Element width, as a share of the container (Image). Direct CSS `width`.
const WIDTH_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.width.full', value: '100%' },
  { labelId: 'Editor.size.width.threeQuarters', value: '75%' },
  { labelId: 'Editor.size.width.half', value: '50%' },
  { labelId: 'Editor.size.width.oneThird', value: '33%' },
  { labelId: 'Editor.size.width.quarter', value: '25%' },
];

// Readable content max-width (RichText). '' = span the container (no max-width).
const CONTENT_WIDTH_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.contentWidth.full', value: '' },
  { labelId: 'Editor.size.contentWidth.wide', value: '1024px' },
  { labelId: 'Editor.size.contentWidth.medium', value: '800px' },
  { labelId: 'Editor.size.contentWidth.narrow', value: '640px' },
];

// Vertical whitespace (Spacer). Direct CSS `height`.
const SPACER_HEIGHT_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.space.tiny', value: '16px' },
  { labelId: 'Editor.size.space.small', value: '32px' },
  { labelId: 'Editor.size.space.medium', value: '48px' },
  { labelId: 'Editor.size.space.large', value: '64px' },
  { labelId: 'Editor.size.space.xlarge', value: '96px' },
];

// Inner padding / gap between items (Grid, RichText). Direct CSS length.
const SPACING_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.spacing.none', value: '0px' },
  { labelId: 'Editor.size.spacing.small', value: '16px' },
  { labelId: 'Editor.size.spacing.medium', value: '24px' },
  { labelId: 'Editor.size.spacing.large', value: '32px' },
  { labelId: 'Editor.size.spacing.xlarge', value: '48px' },
];

// Same scale as SPACING_OPTIONS but unitless (Divider — renderer parseInt()s it).
const SPACING_UNITLESS_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.spacing.none', value: '0' },
  { labelId: 'Editor.size.spacing.small', value: '16' },
  { labelId: 'Editor.size.spacing.medium', value: '24' },
  { labelId: 'Editor.size.spacing.large', value: '32' },
  { labelId: 'Editor.size.spacing.xlarge', value: '48' },
];

// Hero band height. Direct CSS `min-height`.
const HERO_HEIGHT_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.heroHeight.short', value: '300px' },
  { labelId: 'Editor.size.heroHeight.medium', value: '400px' },
  { labelId: 'Editor.size.heroHeight.tall', value: '600px' },
  { labelId: 'Editor.size.heroHeight.fullScreen', value: '100vh' },
];

// Image height. '' = keep the image's natural aspect ratio (auto).
const IMAGE_HEIGHT_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.imageHeight.auto', value: '' },
  { labelId: 'Editor.size.imageHeight.small', value: '200px' },
  { labelId: 'Editor.size.imageHeight.medium', value: '300px' },
  { labelId: 'Editor.size.imageHeight.large', value: '500px' },
];

// Corner rounding (Card, Image). Direct CSS `border-radius`. Mirrors the theme
// manager's radius scale (none/sm/md/lg/full -> 0/4/8/16/9999px).
const RADIUS_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.radius.square', value: '0px' },
  { labelId: 'Editor.size.radius.slight', value: '4px' },
  { labelId: 'Editor.size.radius.rounded', value: '8px' },
  { labelId: 'Editor.size.radius.veryRounded', value: '16px' },
  { labelId: 'Editor.size.radius.pill', value: '9999px' },
];

// Logo bounding box (WebsiteLogo). Unitless — renderer parseInt()s and appends px.
const LOGO_WIDTH_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.generic.small', value: '120' },
  { labelId: 'Editor.size.generic.medium', value: '180' },
  { labelId: 'Editor.size.generic.large', value: '240' },
  { labelId: 'Editor.size.generic.xlarge', value: '320' },
];

const LOGO_HEIGHT_OPTIONS: PresetOption[] = [
  { labelId: 'Editor.size.generic.small', value: '40' },
  { labelId: 'Editor.size.generic.medium', value: '50' },
  { labelId: 'Editor.size.generic.large', value: '64' },
  { labelId: 'Editor.size.generic.xlarge', value: '80' },
];

// Factories — `label` is already localized by the caller (like createFontSizeField).
export const createWidthField = (label: string): Field => createPresetSelectField(label, WIDTH_OPTIONS);
export const createContentWidthField = (label: string): Field =>
  createPresetSelectField(label, CONTENT_WIDTH_OPTIONS);
export const createSpacerHeightField = (label: string): Field =>
  createPresetSelectField(label, SPACER_HEIGHT_OPTIONS);
export const createSpacingField = (label: string): Field => createPresetSelectField(label, SPACING_OPTIONS);
export const createSpacingUnitlessField = (label: string): Field =>
  createPresetSelectField(label, SPACING_UNITLESS_OPTIONS);
export const createHeroHeightField = (label: string): Field =>
  createPresetSelectField(label, HERO_HEIGHT_OPTIONS);
export const createImageHeightField = (label: string): Field =>
  createPresetSelectField(label, IMAGE_HEIGHT_OPTIONS);
export const createRadiusField = (label: string): Field => createPresetSelectField(label, RADIUS_OPTIONS);
export const createLogoWidthField = (label: string): Field =>
  createPresetSelectField(label, LOGO_WIDTH_OPTIONS);
export const createLogoHeightField = (label: string): Field =>
  createPresetSelectField(label, LOGO_HEIGHT_OPTIONS);
