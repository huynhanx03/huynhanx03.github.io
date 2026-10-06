import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getMessages, type Locale } from '../../src/i18n';

describe('section page headings', () => {
  it('uses navigation labels and concise descriptions in both locales', () => {
    const locales: Locale[] = ['en', 'vi'];

    for (const locale of locales) {
      const copy = getMessages(locale);
      const pages = [
        [copy.pages.experience, copy.nav.experience],
        [copy.pages.projects, copy.nav.projects],
        [copy.pages.achievements, copy.nav.achievements],
        [copy.notes, copy.nav.notes],
      ] as const;

      for (const [page, navigationLabel] of pages) {
        expect(page.title).toBe(navigationLabel);
        expect(page.description.length).toBeLessThanOrEqual(65);
      }
    }
  });

  it('renders the notes index with the shared section header', async () => {
    const page = await readFile(new URL('../../src/pages/[locale]/notes/index.astro', import.meta.url), 'utf8');

    expect(page).toContain('<header class="content-page-header notes-page-header">');
    expect(page).toContain('<h1>{copy.notes.title}</h1>');
    expect(page).toContain('<p>{copy.notes.description}</p>');
  });
});
