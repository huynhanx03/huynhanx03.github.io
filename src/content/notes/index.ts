import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { sitePath } from '../../lib/paths';
import type { KnowledgeEntry, KnowledgePair, KnowledgeTaxonomy, NoteLocale as KnowledgeNoteLocale, NoteSummary as SharedNoteSummary } from '../../lib/content/types';
import { relatedEntries } from '../../lib/content/relations';

export type NoteLocale = KnowledgeNoteLocale;
export type NoteEntry = CollectionEntry<'notes'>;
export type NoteSummary = SharedNoteSummary & { translationKey: string };

export function getNoteDescription(note: Pick<NoteSummary, 'data' | 'entry'>): string {
  if (note.data.description) return note.data.description;
  const excerpt = (note.entry.body ?? '')
    .replace(/^---[\s\S]*?---\s*/u, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (excerpt) return `${excerpt.slice(0, 157).trimEnd()}${excerpt.length > 157 ? '…' : ''}`;
  return `${note.data.category}: ${note.data.title}`;
}

function asKnowledge(note: NoteSummary): KnowledgeEntry {
  return { ...note, id: `${note.locale}:${note.slug}`, kind: note.data.kind ?? 'note', status: note.data.draft ? 'draft' : 'published', topic: note.data.category, description: getNoteDescription(note) };
}

function toNote(entry: NoteEntry): NoteSummary | null {
  const match = entry.id.match(/^(.*)_(EN|VI)$/i);
  if (!match) return null;
  const slug = match[1];
  const translationKey = entry.data.translationKey?.trim() || slug;
  return { entry, slug, locale: match[2].toLowerCase() as NoteLocale, translationKey, data: entry.data };
}

function byTitle(a: NoteSummary, b: NoteSummary) {
  return a.data.title.localeCompare(b.data.title, undefined, { numeric: true });
}

async function readFallbackEntries(): Promise<NoteEntry[]> {
  const root = new URL('.', import.meta.url);
  const visit = async (directory: string): Promise<string[]> => {
    const files: string[] = [];
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) files.push(...(await visit(path)));
      else if (item.isFile() && item.name.endsWith('.md')) files.push(path);
    }
    return files;
  };
  const files = await visit(root.pathname);
  return Promise.all(files.map(async (file): Promise<NoteEntry> => {
    const raw = await readFile(file, 'utf8');
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? '';
    const value = (key: string) => frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, 'm'))?.[1]?.trim() ?? '';
    const tagValue = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)?.[1] ?? '';
    const relative = file.slice(root.pathname.length).replace(/\\/g, '/').replace(/\.md$/, '');
    const data = {
      title: value('title'),
      category: value('category'),
      tags: tagValue ? tagValue.split(',').map((tag) => tag.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [],
      translationKey: value('translationKey') || undefined,
      draft: false,
    };
    return { id: relative, collection: 'notes', data, body: raw } as unknown as NoteEntry;
  }));
}

async function getEntries(): Promise<NoteEntry[]> {
  if (process.env.VITEST) return readFallbackEntries();
  const content = await import('astro:content');
  return content.getCollection('notes');
}

export async function getAllNotes(): Promise<NoteSummary[]> {
  const entries = (await getEntries()).filter(({ data }) => !data.draft);
  return entries.map(toNote).filter((note): note is NoteSummary => note !== null).sort(byTitle);
}

export async function getNotesByLocale(locale: NoteLocale): Promise<NoteSummary[]> {
  return (await getAllNotes()).filter((note) => note.locale === locale);
}

export async function getNote(slug: string, locale: NoteLocale): Promise<NoteSummary | null> {
  const notes = await getAllNotes();
  return notes.find((note) => note.locale === locale && note.slug === slug)
    ?? notes.find((note) => note.locale === locale && note.translationKey === slug)
    ?? null;
}

export async function getNotesByCategory(category: string, locale?: NoteLocale): Promise<NoteSummary[]> {
  return (await getAllNotes()).filter((note) => note.data.category === category && (!locale || note.locale === locale));
}

export async function getNotesByTag(tag: string, locale?: NoteLocale): Promise<NoteSummary[]> {
  return (await getAllNotes()).filter((note) => note.data.tags.includes(tag) && (!locale || note.locale === locale));
}

export interface NotePair {
  translationKey: string;
  slug: string;
  en: NoteSummary | null;
  vi: NoteSummary | null;
}

export async function getNotePairs(): Promise<NotePair[]> {
  const byTranslationKey = new Map<string, NotePair>();
  for (const note of await getAllNotes()) {
    const pair = byTranslationKey.get(note.translationKey) ?? { translationKey: note.translationKey, slug: note.slug, en: null, vi: null };
    if (pair[note.locale] && pair[note.locale]?.slug !== note.slug) {
      throw new Error(`Duplicate ${note.locale} translation for ${note.translationKey}: ${pair[note.locale]?.slug} and ${note.slug}`);
    }
    pair[note.locale] = note;
    if (note.locale === 'en' || !pair.slug) pair.slug = note.slug;
    byTranslationKey.set(note.translationKey, pair);
  }
  return [...byTranslationKey.values()].sort((a, b) => a.translationKey.localeCompare(b.translationKey, undefined, { numeric: true }));
}

export function notePath(note: Pick<NoteSummary, 'slug' | 'locale'>): string {
  return sitePath(`/${note.locale}/notes/${note.slug}`);
}

export async function listEntries(locale?: KnowledgeNoteLocale): Promise<KnowledgeEntry[]> {
  const notes = locale ? await getNotesByLocale(locale) : await getAllNotes();
  return notes.map(asKnowledge);
}

export async function getEntry(slug: string, locale: KnowledgeNoteLocale): Promise<KnowledgeEntry | null> {
  const note = await getNote(slug, locale);
  return note ? asKnowledge(note) : null;
}

export async function getTranslations(slug: string): Promise<KnowledgePair> {
  const notes = await getAllNotes();
  const note = notes.find((candidate) => candidate.slug === slug || candidate.translationKey === slug);
  if (!note) return { translationKey: slug, en: null, vi: null };
  const pair = (await getNotePairs()).find((candidate) => candidate.translationKey === note.translationKey);
  return { translationKey: note.translationKey, en: pair?.en ? asKnowledge(pair.en) : null, vi: pair?.vi ? asKnowledge(pair.vi) : null };
}

export async function getTranslatedNote(note: Pick<NoteSummary, 'translationKey' | 'locale'>): Promise<NoteSummary | null> {
  const pair = (await getNotePairs()).find((candidate) => candidate.translationKey === note.translationKey);
  const otherLocale: NoteLocale = note.locale === 'en' ? 'vi' : 'en';
  return pair?.[otherLocale] ?? null;
}

export async function getRelatedEntries(entry: KnowledgeEntry, limit = 4): Promise<KnowledgeEntry[]> {
  return relatedEntries(entry, await listEntries(entry.locale), limit);
}

export async function getSeries(series: string, locale?: KnowledgeNoteLocale): Promise<KnowledgeEntry[]> {
  return (await listEntries(locale)).filter((entry) => entry.data.series === series).sort((a, b) => (a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER) - (b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER) || a.data.title.localeCompare(b.data.title));
}

export async function getTaxonomy(locale?: KnowledgeNoteLocale): Promise<KnowledgeTaxonomy> {
  const entries = await listEntries(locale);
  return { topics: [...new Set(entries.map((entry) => entry.topic))].sort(), tags: [...new Set(entries.flatMap((entry) => entry.data.tags))].sort(), kinds: [...new Set(entries.map((entry) => entry.kind))].sort() as KnowledgeTaxonomy['kinds'] };
}
