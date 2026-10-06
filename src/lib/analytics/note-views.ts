import snapshot from '../../data/note-views.json';

interface NoteViewsSnapshot {
  updatedAt: string | null;
  counts: Record<string, { count: number; updatedAt: string }>;
}

const data = snapshot as NoteViewsSnapshot;

export function getNoteViews(path: string): { count: number; updatedAt: string } | undefined {
  const value = data.counts[path];
  if (!Number.isSafeInteger(value?.count) || value.count < 0 || !value.updatedAt) return undefined;
  return value;
}
