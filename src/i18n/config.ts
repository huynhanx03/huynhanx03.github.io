import { sitePath } from '../lib/paths';

export const locales = ['en', 'vi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'vi';
}

export function requireLocale(value: unknown): Locale {
  if (typeof value !== 'string' || !isLocale(value)) {
    throw new Error(`Unsupported locale: ${String(value)}`);
  }
  return value;
}

export function localizedPath(locale: Locale, path = '/'): string {
  const normalized = path === '/' ? '/' : `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return sitePath(`/${locale}${normalized === '/' ? '/' : normalized}`);
}

export function localeFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  return isLocale(segments[0]) ? segments[0] : null;
}

export function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return isLocale(segments[0]) ? `/${segments.slice(1).join('/')}` || '/' : pathname || '/';
}

export function localizedPathForUrl(url: URL, locale: Locale): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const pathname = url.pathname.startsWith(base) ? url.pathname.slice(base.length) || '/' : url.pathname;
  return `${localizedPath(locale, pathWithoutLocale(pathname))}${url.search}${url.hash}`;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'vi' : 'en';
}
