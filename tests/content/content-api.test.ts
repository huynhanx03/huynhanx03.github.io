import { describe, expect, it } from 'vitest';
import { readdir } from 'node:fs/promises';
import { getAllNotes, getEntry, getNote, getNotePairs, getNotesByCategory, getNotesByLocale, getRelatedEntries, getTaxonomy, getTranslations, listEntries } from '../../src/content/notes';

describe('knowledge content API', () => {
  it('keeps Go note filenames free of sequence prefixes', async () => {
    const files = await readdir(new URL('../../src/content/notes/go/', import.meta.url));

    expect(files.filter((file) => /^\d+_/u.test(file))).toEqual([]);
  });

  it('loads published notes and pairs the bilingual variants', async () => {
    const all = await getAllNotes();
    const pairs = await getNotePairs();
    expect(all).toHaveLength(46);
    expect(pairs).toHaveLength(23);
    expect(pairs.every((pair) => pair.en && pair.vi)).toBe(true);
    expect(new Set(all.map((note) => note.slug)).size).toBe(23);
  });

  it('keeps locale selection explicit and preserves nested categories', async () => {
    const english = await getNotesByLocale('en');
    const vietnamese = await getNotesByLocale('vi');
    expect(english).toHaveLength(23);
    expect(vietnamese).toHaveLength(23);
    const introduction = await getNote('go/intro', 'en');
    expect(introduction?.data.title).toBe('Introduction');
    expect(introduction?.slug).toBe('go/intro');
    expect(await getNote('missing/slug', 'en')).toBeNull();
    expect((await getNotesByCategory('Go', 'en')).length).toBeGreaterThan(5);
    expect((await listEntries('en'))[0].status).toBe('published');
    expect((await getTranslations('go/intro')).vi?.locale).toBe('vi');
    expect(await getEntry('missing/slug', 'vi')).toBeNull();
    expect((await getTaxonomy('en')).topics).toContain('Go');
  });

  it('derives related reading from shared topics and tags', async () => {
    const entry = await getEntry('go/goroutines', 'en');
    expect(entry).not.toBeNull();
    const related = await getRelatedEntries(entry!, 3);
    expect(related).toHaveLength(3);
    expect(related.every((candidate) => candidate.locale === 'en' && candidate.slug !== entry!.slug)).toBe(true);
  });
});
