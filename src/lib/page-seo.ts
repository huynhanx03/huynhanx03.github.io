import type { Locale } from '../i18n';
import { locales, localizedPath, otherLocale } from '../i18n';
import { absoluteSiteUrl } from './paths';
import type { SiteConfig } from '../data/types';
import { buildBreadcrumbSchema, buildCollectionSchema, buildPersonSchema, buildWebPageSchema } from './seo';

export interface LocalizedPageUrls {
  canonical: string;
  alternateUrls: Record<Locale, string>;
  localeSwitchUrl: string;
}

export function localizedStaticPaths() {
  return locales.map((locale) => ({ params: { locale }, props: { locale } }));
}

export function getLocalizedPageUrls(locale: Locale, pathname: string, origin: URL | string): LocalizedPageUrls {
  const alternateUrls = Object.fromEntries(
    locales.map((candidate) => [candidate, absoluteSiteUrl(localizedPath(candidate, pathname), origin)]),
  ) as Record<Locale, string>;
  return {
    canonical: alternateUrls[locale],
    alternateUrls,
    localeSwitchUrl: localizedPath(otherLocale(locale), pathname),
  };
}

export function buildLocalizedPageSchemas(input: {
  site: SiteConfig;
  locale: Locale;
  urls: LocalizedPageUrls;
  name: string;
  description: string;
  homeLabel: string;
  type?: 'WebPage' | 'CollectionPage' | 'ProfilePage';
  items?: Array<{ name: string; url: string }>;
}) {
  const homeUrl = absoluteSiteUrl(localizedPath(input.locale, '/'), new URL(input.urls.canonical).origin);
  const page = input.items
    ? buildCollectionSchema({ name: input.name, description: input.description, url: input.urls.canonical, locale: input.locale, items: input.items })
    : buildWebPageSchema({ name: input.name, description: input.description, url: input.urls.canonical, locale: input.locale, type: input.type });
  return [
    buildPersonSchema(input.site, input.urls.canonical),
    page,
    buildBreadcrumbSchema([
      { name: input.homeLabel, url: homeUrl },
      { name: input.name, url: input.urls.canonical },
    ]),
  ];
}
