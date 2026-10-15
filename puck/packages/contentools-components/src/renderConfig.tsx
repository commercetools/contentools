import type { Config, ComponentConfig } from '@measured/puck';
import * as C from './components';

/**
 * Render-only Puck config: each component's `render` function, keyed by the same
 * component names the editor's `createDefaultPuckConfig` uses. No `fields` (those
 * are editor-only), so this graph never touches @commercetools/nimbus.
 */
const components: Record<string, ComponentConfig> = {
  Hero: { render: C.renderHero },
  RichText: { render: C.renderRichText },
  Grid: { render: C.renderGrid },
  Columns: { render: C.renderColumns },
  Image: { render: C.renderImage },
  Button: { render: C.renderButton },
  Card: { render: C.renderCard },
  Spacer: { render: C.renderSpacer },
  ProductTeaser: { render: C.renderProductTeaser },
  HeroBanner: { render: C.renderHeroBanner },
  TextBlock: { render: C.renderTextBlock },
  CategoryGrid: { render: C.renderCategoryGrid },
  CategoryHero: { render: C.renderCategoryHero },
  CheckoutPromoBanner: { render: C.renderCheckoutPromoBanner },
  CountdownBanner: { render: C.renderCountdownBanner },
  CrossSellBlock: { render: C.renderCrossSellBlock },
  DeliveryMessage: { render: C.renderDeliveryMessage },
  Divider: { render: C.renderDivider },
  EmptyState: { render: C.renderEmptyState },
  FAQAccordion: { render: C.renderFAQAccordion },
  FooterBlock: { render: C.renderFooterBlock },
  ImageBlock: { render: C.renderImageBlock },
  NewsletterSignup: { render: C.renderNewsletterSignup },
  ProductBanner: { render: C.renderProductBanner },
  ProductGridHeader: { render: C.renderProductGridHeader },
  ProductSlider: { render: C.renderProductSlider },
  PromotionalBanner: { render: C.renderPromotionalBanner },
  RelatedProductsSlider: { render: C.renderRelatedProductsSlider },
  SocialLinks: { render: C.renderSocialLinks },
  TabContent: { render: C.renderTabContent },
  TestimonialsSlider: { render: C.renderTestimonialsSlider },
  ThankYouContent: { render: C.renderThankYouContent },
  TrustBadges: { render: C.renderTrustBadges },
  VideoBlock: { render: C.renderVideoBlock },
  WebsiteLogo: { render: C.renderWebsiteLogo },
} as unknown as Record<string, ComponentConfig>;

export function createRenderConfig(): Config {
  return {
    components,
    root: { render: C.renderRoot },
  } as unknown as Config;
}

export const defaultRenderConfig: Config = createRenderConfig();
