import type { NoteLocale } from './index';

const WORDS_PER_MINUTE: Record<NoteLocale, number> = { en: 220, vi: 260 };

function readableText(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\s*/u, '')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/gu, ' ')
    .replace(/`[^`]*`/gu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)/gmu, '')
    .replace(/\[[ xX]\]\s+/gu, '')
    .replace(/https?:\/\/\S+/gu, ' ')
    .replace(/[*_~]/gu, ' ');
}

export function getReadingStats(
  markdown: string,
  locale: NoteLocale,
  wordsPerMinute = WORDS_PER_MINUTE[locale],
): { words: number; minutes: number } {
  const segments = new Intl.Segmenter(locale, { granularity: 'word' }).segment(readableText(markdown));
  const words = [...segments].filter((segment) => segment.isWordLike).length;
  const safeRate = Number.isFinite(wordsPerMinute) && wordsPerMinute > 0 ? wordsPerMinute : WORDS_PER_MINUTE[locale];
  return { words, minutes: Math.max(1, Math.ceil(words / safeRate)) };
}
