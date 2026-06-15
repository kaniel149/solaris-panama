// ─── SEO Components ───────────────────────────────────────────────────────────
export { SEOHead } from './SEOHead';

// ─── Schema Helpers ───────────────────────────────────────────────────────────
export {
  BASE_URL,
  localBusinessSchema,
  websiteSchema,
  serviceSchema,
  faqSchema,
  articleSchema,
  breadcrumbSchema,
  organizationSchema,
  webPageSchema,
  projectListSchema,
  townLocalBusinessSchema,
  townServiceSchema,
  homeBreadcrumb,
  pageBreadcrumb,
  // Pre-built FAQ content (Spanish)
  PANAMA_FAQS_ES,
} from './schemas';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  BreadcrumbItem,
  ArticleSchemaInput,
  ItemListEntry,
  TownSchemaInput,
  SeoLang,
} from './schemas';
