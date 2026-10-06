function normalizeBasePath(basePath = '') {
  const normalized = `/${basePath}`.replace(/\/{2,}/gu, '/').replace(/\/$/u, '');
  return normalized === '/' ? '' : normalized;
}

export function noteViewPath(basePath, note) {
  return `${normalizeBasePath(basePath)}/${note.locale}/notes/${note.slug}/`.replace(/\/{2,}/gu, '/');
}

export function noteViewEndpoint(code, basePath, note) {
  const path = noteViewPath(basePath, note);
  return `https://${code.trim()}.goatcounter.com/counter/${encodeURIComponent(path)}.json`;
}

export function parseViewCount(payload) {
  const value = payload?.count;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/[\s,_]/gu, '');
  if (!/^\d+$/u.test(digits)) return undefined;
  const count = Number(digits);
  return Number.isSafeInteger(count) ? count : undefined;
}

export async function fetchNoteViewSnapshot({ notes, previous, code, basePath = '', fetcher = fetch, now = new Date() }) {
  if (!code?.trim()) return { snapshot: previous, successCount: 0, errorCount: 0, skipped: true };

  const results = await Promise.all(notes.map(async (note) => {
    const route = noteViewPath(basePath, note);
    try {
      const response = await fetcher(noteViewEndpoint(code, basePath, note));
      if (!response.ok) throw new Error(`Counter returned HTTP ${response.status}`);
      const count = parseViewCount(await response.json());
      if (count === undefined) throw new Error('Counter returned an invalid page-view count');
      return { route, count };
    } catch {
      return { route, error: true };
    }
  }));

  const counts = { ...previous.counts };
  let successCount = 0;
  let errorCount = 0;
  for (const result of results) {
    if ('count' in result) {
      counts[result.route] = { count: result.count, updatedAt: now.toISOString().slice(0, 10) };
      successCount += 1;
    } else errorCount += 1;
  }

  return {
    snapshot: successCount > 0 ? { updatedAt: now.toISOString().slice(0, 10), counts } : previous,
    successCount,
    errorCount,
    skipped: false,
  };
}
