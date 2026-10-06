import type { APIContext } from 'astro';
import { sitePath } from '../lib/paths';

export function GET({ site }: APIContext) {
  const origin = site?.toString().replace(/\/$/, '') ?? 'https://huynhanx03.github.io';
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}${sitePath('/sitemap-index.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
