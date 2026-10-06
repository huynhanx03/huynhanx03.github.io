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
    expect(pairs).toHaveLength(new Set(all.map((note) => note.translationKey)).size);
    expect(pairs.filter((pair) => pair.en && pair.vi)).toHaveLength(23);
    expect(pairs.filter((pair) => pair.vi && !pair.en).length).toBeGreaterThan(0);
    expect(pairs.every((pair) => pair.en || pair.vi)).toBe(true);
    expect(new Set(all.map((note) => `${note.locale}/${note.slug}`)).size).toBe(all.length);
  });

  it('keeps locale selection explicit and preserves nested categories', async () => {
    const english = await getNotesByLocale('en');
    const vietnamese = await getNotesByLocale('vi');
    expect(english).toHaveLength(23);
    expect(vietnamese.length).toBeGreaterThan(english.length);
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

  it('groups the engine articles under one category while keeping shared notes separate', async () => {
    const notes = await getNotesByCategory('Workflow Engine', 'vi');
    const regularNotes = notes.filter((note) => note.data.kind === 'note');
    const guideNotes = notes.filter((note) => note.data.kind === 'guide');

    expect(regularNotes.map((note) => note.data.title).sort()).toEqual(['Cron vs Schedule', 'Workflow History là dữ liệu bền vững'].sort());
    expect(guideNotes).toHaveLength(16);
    expect((await getTaxonomy('vi')).topics).toContain('Workflow Engine');
    expect((await getTaxonomy('vi')).topics).not.toContain('Cadence');
    expect((await getTaxonomy('vi')).topics).not.toContain('Temporal');
  });

  it('derives related reading from shared topics and tags', async () => {
    const entry = await getEntry('go/goroutines', 'en');
    expect(entry).not.toBeNull();
    const related = await getRelatedEntries(entry!, 3);
    expect(related).toHaveLength(3);
    expect(related.every((candidate) => candidate.locale === 'en' && candidate.slug !== entry!.slug)).toBe(true);
  });
});
