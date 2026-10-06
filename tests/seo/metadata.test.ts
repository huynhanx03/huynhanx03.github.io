import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('SEO contract', () => {
  it('declares canonical, language alternates, social cards, and structured data', async () => {
    const [layout, home, seo] = await Promise.all([
      readFile(new URL('../../src/layouts/BaseLayout.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/pages/[locale]/index.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/lib/seo.ts', import.meta.url), 'utf8'),
    ]);
    expect(layout).toContain('rel="canonical"');
    expect(layout).toContain('hreflang="x-default"');
    expect(layout).toContain('og:image');
    expect(layout).toContain('og:locale');
    expect(home).toContain('buildPersonSchema');
    expect(home).toContain('buildWebsiteSchema');
    expect(home).toContain('alternateUrls');
    expect(seo).toContain("'BlogPosting'");
    expect(seo).toContain('wordCount');
  });
});
