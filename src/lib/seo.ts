import type { Locale } from '../i18n';
import type { SiteConfig } from '../data/types';

function siteRoot(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const localeIndex = segments.findIndex((segment) => segment === 'en' || segment === 'vi');
  parsed.pathname = `${localeIndex >= 0 ? `/${segments.slice(0, localeIndex).join('/')}` : `/${segments.join('/')}`}/`.replace('//', '/');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function entityId(url: string, fragment: string): string { return `${siteRoot(url)}#${fragment}`; }

export function buildPersonSchema(site: SiteConfig, url: string) {
  return { '@type': 'Person', '@id': entityId(url, 'person'), name: site.name, jobTitle: site.role, url: siteRoot(url), sameAs: [site.links.github, site.links.linkedin], knowsAbout: site.seo.keywords };
}

export function buildWebsiteSchema(site: SiteConfig, url: string, locale: Locale) {
  return { '@type': 'WebSite', '@id': entityId(url, 'website'), name: site.name, url: siteRoot(url), description: site.seo.description, inLanguage: locale, publisher: { '@id': entityId(url, 'person') } };
}

export function buildWebPageSchema(input: { name: string; description: string; url: string; locale: Locale; type?: 'WebPage' | 'CollectionPage' | 'ProfilePage' }) {
  return { '@type': input.type ?? 'WebPage', '@id': `${input.url}#webpage`, name: input.name, description: input.description, url: input.url, inLanguage: input.locale, isPartOf: { '@id': entityId(input.url, 'website') } };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) };
}

export function buildCollectionSchema(input: { name: string; description: string; url: string; locale: Locale; items: Array<{ name: string; url: string }> }) {
  return { ...buildWebPageSchema(input), '@type': 'CollectionPage', mainEntity: { '@type': 'ItemList', itemListElement: input.items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: item.url })) } };
}

export function buildArticleSchema(input: { headline: string; description: string; url: string; locale: Locale; category: string; image: string; wordCount: number; updated?: Date; published?: Date; authorUrl: string; breadcrumbs: Array<{ name: string; url: string }> }) {
  return {
    '@type': input.updated || input.published ? 'BlogPosting' : 'Article',
    headline: input.headline,
    description: input.description,
    inLanguage: input.locale,
    url: input.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    image: [input.image],
    author: { '@type': 'Person', name: 'Huỳnh Mai Cao Nhân', url: input.authorUrl },
    publisher: { '@id': entityId(input.authorUrl, 'person') },
    articleSection: input.category,
    wordCount: input.wordCount,
    ...(input.published ? { datePublished: input.published.toISOString() } : {}),
    ...(input.updated ? { dateModified: input.updated.toISOString() } : {}),
    breadcrumb: buildBreadcrumbSchema(input.breadcrumbs),
  };
}
