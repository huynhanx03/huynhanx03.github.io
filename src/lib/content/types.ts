import type { CollectionEntry } from 'astro:content';

export type NoteLocale = 'en' | 'vi';
export type NoteEntry = CollectionEntry<'notes'>;
export interface NoteSummary {
  entry: NoteEntry;
  slug: string;
  locale: NoteLocale;
  data: NoteEntry['data'];
  translationKey?: string;
}

export const KNOWLEDGE_KINDS = ['note', 'guide', 'interview-question', 'reference', 'link', 'project-log', 'glossary'] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];
export type KnowledgeStatus = 'published' | 'draft';

export interface KnowledgeEntry extends NoteSummary {
  id: string;
  kind: KnowledgeKind;
  status: KnowledgeStatus;
  translationKey: string;
  topic: string;
  description: string;
}

export interface KnowledgePair { translationKey: string; en: KnowledgeEntry | null; vi: KnowledgeEntry | null }
export interface KnowledgeTaxonomy { topics: string[]; tags: string[]; kinds: KnowledgeKind[] }
