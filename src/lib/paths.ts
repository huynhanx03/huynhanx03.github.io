const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function sitePath(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${basePath}/`;
  const isFile = /\/[^/]+\.[^/]+$/.test(normalized);
  const withSlash = isFile || normalized.endsWith('/') ? normalized : `${normalized}/`;
  return `${basePath}${withSlash}`;
}

export function absoluteSiteUrl(path: string, origin: URL | string): string {
  const alreadyBaseAware = basePath && (path === basePath || path.startsWith(`${basePath}/`));
  return new URL(alreadyBaseAware ? path : sitePath(path), origin).toString();
}
