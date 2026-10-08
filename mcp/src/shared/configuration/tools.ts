import { z } from 'zod';
import type { Tool } from '../../types/tools';

const businessUnitKeyParam = z.string().optional().describe('Business unit key (default from context)');
const configValueSchema = z.record(z.string(), z.any()).describe('Configuration value (JSON object)');
const b2bAccountMenuLinkSchema = z.object({ label: z.string(), href: z.string() });
const b2bAccountMenuLinksValueSchema = z.array(b2bAccountMenuLinkSchema).describe('Array of { label, href }');
const themeTokensSchema = z.object({
  colorPrimary: z.string(),
  colorPrimaryHover: z.string(),
  colorSecondary: z.string(),
  colorBackground: z.string(),
  colorSurface: z.string(),
  colorText: z.string(),
  colorTextMuted: z.string(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
  borderWidth: z.enum(['0', '1', '2']),
  fontFamily: z.string(),
  fontHeading: z.string(),
  spacingScale: z.number(),
  buttonStyle: z.enum(['solid', 'outline', 'ghost']),
  cardShadow: z.enum(['none', 'sm', 'md', 'lg']),
  headerStyle: z.enum(['transparent', 'solid', 'minimal']),
});

export const configurationTools: Tool[] = [
  {
    method: 'get_all_configurations',
    name: 'Get All Configurations',
    description: 'Get all configuration slices for a business unit in one call.',
    parameters: z.object({ businessUnitKey: businessUnitKeyParam }),
    actions: { configuration: { read: true } },
  },
  {
    method: 'get_theme',
    name: 'Get Configuration Theme',
    description: 'Get the configuration theme for a business unit.',
    parameters: z.object({ businessUnitKey: businessUnitKeyParam }),
    actions: { configuration: { read: true } },
  },
  {
    method: 'create_theme',
    name: 'Create Configuration Theme',
    description: 'Create the configuration theme for a business unit.',
    parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: themeTokensSchema }),
    actions: { configuration: { create: true } },
  },
  {
    method: 'update_theme',
    name: 'Update Configuration Theme',
    description: 'Update the configuration theme for a business unit.',
    parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: themeTokensSchema }),
    actions: { configuration: { update: true } },
  },
  {
    method: 'delete_theme',
    name: 'Delete Configuration Theme',
    description: 'Delete the configuration theme for a business unit.',
    parameters: z.object({ businessUnitKey: businessUnitKeyParam }),
    actions: { configuration: { update: true } },
  },
  // Header
  { method: 'get_header', name: 'Get Configuration Header', description: 'Get header configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_header', name: 'Create Configuration Header', description: 'Create header configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_header', name: 'Update Configuration Header', description: 'Update header configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_header', name: 'Delete Configuration Header', description: 'Delete header configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // Facet
  { method: 'get_facet', name: 'Get Configuration Facet', description: 'Get facet configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_facet', name: 'Create Configuration Facet', description: 'Create facet configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_facet', name: 'Update Configuration Facet', description: 'Update facet configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_facet', name: 'Delete Configuration Facet', description: 'Delete facet configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // Footer
  { method: 'get_footer', name: 'Get Configuration Footer', description: 'Get footer configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_footer', name: 'Create Configuration Footer', description: 'Create footer configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_footer', name: 'Update Configuration Footer', description: 'Update footer configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_footer', name: 'Delete Configuration Footer', description: 'Delete footer configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // Site metadata
  { method: 'get_site_metadata', name: 'Get Configuration Site Metadata', description: 'Get site metadata configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_site_metadata', name: 'Create Configuration Site Metadata', description: 'Create site metadata configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_site_metadata', name: 'Update Configuration Site Metadata', description: 'Update site metadata configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_site_metadata', name: 'Delete Configuration Site Metadata', description: 'Delete site metadata configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // Category listing
  { method: 'get_category_listing', name: 'Get Configuration Category Listing', description: 'Get category listing configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_category_listing', name: 'Create Configuration Category Listing', description: 'Create category listing configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_category_listing', name: 'Update Configuration Category Listing', description: 'Update category listing configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_category_listing', name: 'Delete Configuration Category Listing', description: 'Delete category listing configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // Translations
  { method: 'get_translations', name: 'Get Configuration Translations', description: 'Get translations configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_translations', name: 'Create Configuration Translations', description: 'Create translations configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_translations', name: 'Update Configuration Translations', description: 'Update translations configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: configValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_translations', name: 'Delete Configuration Translations', description: 'Delete translations configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
  // B2B account menu links
  { method: 'get_b2b_account_menu_links', name: 'Get B2B Account Menu Links', description: 'Get B2B account menu links configuration for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { read: true } } },
  { method: 'create_b2b_account_menu_links', name: 'Create B2B Account Menu Links', description: 'Create B2B account menu links for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: b2bAccountMenuLinksValueSchema }), actions: { configuration: { create: true } } },
  { method: 'update_b2b_account_menu_links', name: 'Update B2B Account Menu Links', description: 'Update B2B account menu links for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam, value: b2bAccountMenuLinksValueSchema }), actions: { configuration: { update: true } } },
  { method: 'delete_b2b_account_menu_links', name: 'Delete B2B Account Menu Links', description: 'Delete B2B account menu links for a business unit.', parameters: z.object({ businessUnitKey: businessUnitKeyParam }), actions: { configuration: { update: true } } },
];
