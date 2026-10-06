import type { KnowledgeEntry } from './types';

export function relatedEntries(entry: KnowledgeEntry, entries: KnowledgeEntry[], limit = 4): KnowledgeEntry[] {
  const explicit = new Set(entry.data.related ?? []);
  const scored = entries
    .filter((candidate) => candidate.id !== entry.id)
    .map((candidate) => ({
      candidate,
      explicit: explicit.has(candidate.slug) || explicit.has(candidate.id) || explicit.has(candidate.translationKey),
      score: (candidate.topic === entry.topic ? 2 : 0) + candidate.data.tags.filter((tag) => entry.data.tags.includes(tag)).length,
    }))
    .filter(({ score, explicit: isExplicit }) => score > 0 || isExplicit)
    .sort((a, b) => Number(b.explicit) - Number(a.explicit) || b.score - a.score || a.candidate.data.title.localeCompare(b.candidate.data.title));
  return scored.slice(0, limit).map(({ candidate }) => candidate);
}
