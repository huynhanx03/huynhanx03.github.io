import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('shared Astro shell', () => {
  it('exposes accessible navigation and SEO-capable layout props', async () => {
    const [header, base, notFound] = await Promise.all([
      readFile(new URL('../../src/components/layout/SiteHeader.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/layouts/BaseLayout.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/pages/404.astro', import.meta.url), 'utf8'),
    ]);

    expect(header).toContain('aria-label={copy.nav.primary}');
    expect(header).toContain("localizedPath(locale, '/notes')");
    expect(header).toContain("locale === 'vi'");
    expect(header).toContain('localeSwitchUrl');
    expect(header).toContain('data-theme-toggle');
    expect(base).toContain('rel="canonical"');
    expect(base).toContain('hreflang');
    expect(base).toContain('og:title');
    expect(base).toContain('og:locale');
    expect(base).toContain("localStorage.getItem(themeKey)");
    expect(base).toContain('localStorage.setItem(\'portfolio-theme\', next)');
    expect(base).toContain("prefers-color-scheme: light");
    expect(base).toContain("button.setAttribute('aria-pressed'");
    expect(notFound).toContain("localeSwitchUrl={localizedPath('vi', '/')}");
  });

  it('defines both themes once and switches highlighted code colors with the selected theme', async () => {
    const [styles, config, problemDetail] = await Promise.all([
      readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
      readFile(new URL('../../astro.config.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../src/pages/[locale]/problem-solving/[key].astro', import.meta.url), 'utf8'),
    ]);

    expect(styles.match(/:root \{/g)).toHaveLength(1);
    expect(styles.match(/:root\[data-theme="light"\] \{/g)).toHaveLength(1);
    expect(styles).toContain('--bg-gradient-end: #edf2f9');
    expect(styles).toContain('--code-bg: #f6f8fa');
    expect(styles).toContain(':root[data-theme="dark"] .astro-code');
    expect(config).toContain('themes: { light: "github-light", dark: "github-dark" }');
    expect(problemDetail).toContain("defaultColor={false}");
  });
});
