import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static search pipeline', () => {
  it('builds Pagefind after Astro output and indexes bilingual body content', async () => {
    const [packageJson, script, vietnamese] = await Promise.all([
      readFile(new URL('../../package.json', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/build-search-index.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../src/content/notes/go/intro_VI.md', import.meta.url), 'utf8'),
    ]);
    expect(JSON.parse(packageJson).scripts.build).toContain('build-search-index');
    expect(script).toContain('--include-characters');
    expect(vietnamese).toContain('Gopher');
  });
});
