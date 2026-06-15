import { useEffect } from 'react';
import { localBusinessSchema, BASE_URL } from './schemas';
import type { SeoLang } from './schemas';

const DEFAULT_OG_IMAGE = `${BASE_URL}/solaris-logo-dark.png`;

interface SEOHeadProps {
  /** Page title — appended with " | Solaris Panamá". */
  title: string;
  /** Meta description — aim for 150–160 characters. */
  description: string;
  /** Path (e.g. "/servicios" or "/"). */
  path: string;
  /** Active language (defaults to Spanish — the canonical SEO locale). */
  lang?: SeoLang;
  /** Additional JSON-LD schema object(s) injected alongside LocalBusiness. */
  schema?: object | object[];
  /** Absolute URL to the Open Graph image (1200×630). Falls back to default. */
  ogImage?: string;
  /** og:type="article" on blog posts. */
  isArticle?: boolean;
  /** Robots directive. Defaults to "index, follow". */
  robots?: string;
}

/**
 * SEOHead — dependency-free head manager for Solaris Panamá (no react-helmet).
 *
 * Imperatively maintains <title>, meta description/robots, canonical, Open
 * Graph + Twitter tags, and JSON-LD structured data (LocalBusiness always
 * included). Cleans up on unmount so SPA route changes don't leak tags.
 *
 * @example
 * <SEOHead
 *   title="Paneles Solares en Panamá"
 *   description="Instalación profesional de paneles solares..."
 *   path="/servicios"
 *   schema={serviceSchema()}
 * />
 */
export function SEOHead({
  title,
  description,
  path,
  lang = 'es',
  schema,
  ogImage,
  isArticle = false,
  robots = 'index, follow',
}: SEOHeadProps) {
  useEffect(() => {
    const canonicalUrl = `${BASE_URL}${path === '/' ? '' : path}`;
    const pageTitle = `${title} | Solaris Panamá`;
    const ogImageUrl = ogImage ?? DEFAULT_OG_IMAGE;
    const ogType = isArticle ? 'article' : 'website';

    // Always inject LocalBusiness; merge with any page-specific schemas.
    const localBusiness = localBusinessSchema(lang);
    const extraSchemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
    const allSchemas = [localBusiness, ...extraSchemas];
    const schemaOutput =
      allSchemas.length === 1
        ? allSchemas[0]
        : { '@context': 'https://schema.org', '@graph': allSchemas };

    // Track elements we create so we can remove them on cleanup.
    const created: Element[] = [];

    const prevTitle = document.title;
    document.title = pageTitle;

    const prevHtmlLang = document.documentElement.lang;
    document.documentElement.lang = lang === 'he' ? 'he' : lang === 'en' ? 'en' : 'es';

    /** Upsert a <meta> tag; record it for cleanup only if newly created. */
    const upsertMeta = (key: string, value: string, attr: 'name' | 'property' = 'name') => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute('content', value);
      return el;
    };

    const upsertLink = (rel: string, href: string, extra?: Record<string, string>) => {
      const selector = extra?.hreflang
        ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
        : `link[rel="${rel}"]`;
      let el = document.head.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        if (extra?.hreflang) el.setAttribute('hreflang', extra.hreflang);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute('href', href);
      return el;
    };

    // Core meta
    upsertMeta('description', description);
    upsertMeta('robots', robots);

    // Canonical + hreflang (Spanish-only canonical for Panama)
    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', canonicalUrl, { hreflang: 'es' });
    upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });

    // Open Graph
    upsertMeta('og:type', ogType, 'property');
    upsertMeta('og:site_name', 'Solaris Panamá', 'property');
    upsertMeta('og:locale', 'es_PA', 'property');
    upsertMeta('og:url', canonicalUrl, 'property');
    upsertMeta('og:title', pageTitle, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', ogImageUrl, 'property');
    upsertMeta('og:image:width', '1200', 'property');
    upsertMeta('og:image:height', '630', 'property');
    upsertMeta('og:image:alt', title, 'property');

    // Twitter / X
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', pageTitle);
    upsertMeta('twitter:description', description);
    upsertMeta('twitter:image', ogImageUrl);

    // JSON-LD structured data (own a dedicated script element per page)
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.setAttribute('data-seo', 'solaris');
    ld.textContent = JSON.stringify(schemaOutput);
    document.head.appendChild(ld);
    created.push(ld);

    return () => {
      document.title = prevTitle;
      document.documentElement.lang = prevHtmlLang;
      created.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [title, description, path, lang, schema, ogImage, isArticle, robots]);

  return null;
}

export default SEOHead;
